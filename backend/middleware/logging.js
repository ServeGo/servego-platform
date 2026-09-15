import { runWithRequestContext, getRequestContext } from '../utils/telemetry/requestContext.js';
import { logger } from '../utils/telemetry/logger.js';
import { metrics } from '../utils/telemetry/metrics.js';

const LOG_LEVELS = { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO' };

const SENSITIVE_FIELDS = ['password', 'confirmPassword', 'token', 'refreshToken', 'apiKey', 'secret'];

function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) sanitized[field] = '[REDACTED]';
  }
  return sanitized;
}

function getResponseTime(startTime) {
  const diff = process.hrtime(startTime);
  return Math.round((diff[0] * 1e3 + diff[1] / 1e6) * 100) / 100;
}

function getLogLevel(statusCode) {
  if (statusCode >= 500) return LOG_LEVELS.ERROR;
  if (statusCode >= 400) return LOG_LEVELS.WARN;
  return LOG_LEVELS.INFO;
}

function generateRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Resolve the Express route pattern (e.g. `POST /api/v1/bookings`) instead of
 * the raw path, so logs group by endpoint even when ids appear in the URL.
 * Falls back to the raw path for unrouted 404s.
 */
function resolveRoutePattern(req) {
  const base = req.baseUrl || '';
  const pattern = req.route?.path;
  return pattern ? `${req.method} ${base}${pattern}` : `${req.method} ${req.path}`;
}

function fallbackErrorCode(statusCode) {
  if (statusCode >= 500) return 'INTERNAL_ERROR';
  if (statusCode === 429) return 'RATE_LIMITED';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  return `HTTP_${statusCode}`;
}

export const requestLogger = (req, res, next) => {
  if (req.path === '/api/health') return next();

  const startTime = process.hrtime();
  const requestId = generateRequestId();
  const context = { requestId, userId: null, role: null, startTime };

  req.requestId = requestId;
  req._startTime = startTime;
  res.setHeader('X-Request-ID', requestId);

  const originalEnd = res.end.bind(res);

  res.end = function (chunk, encoding) {
    res.end = originalEnd;
    const result = originalEnd(chunk, encoding);

    const durationMs = getResponseTime(startTime);
    const logLevel = getLogLevel(res.statusCode);
    const route = resolveRoutePattern(req);
    const errorCode = res.locals?.errorCode || (res.statusCode >= 400 ? fallbackErrorCode(res.statusCode) : null);

    metrics.recordRequest({ route, statusCode: res.statusCode, durationMs });
    if (res.statusCode >= 400) metrics.recordError(errorCode);

    const logData = {
      event: 'request.finish',
      requestId,
      userId: req.user?.id || context.userId || null,
      userRole: req.user?.role || context.role || null,
      method: req.method,
      route,
      path: req.path,
      query: Object.keys(req.query || {}).length > 0 ? req.query : undefined,
      statusCode: res.statusCode,
      durationMs,
      responseTime: `${durationMs}ms`,
      errorCode,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.get('user-agent'),
      contentLength: res.get('content-length') || 0
    };

    if (logLevel === LOG_LEVELS.ERROR) logger.error('request.finish', logData);
    else if (logLevel === LOG_LEVELS.WARN) logger.warn('request.finish', logData);
    else if (process.env.NODE_ENV !== 'production') logger.info('request.finish', logData);

    return result;
  };

  return runWithRequestContext(context, next);
};

export const errorHandler = (err, req, res, next) => {
  const durationMs = req._startTime ? getResponseTime(req._startTime) : null;
  const route = resolveRoutePattern(req);
  const errorCode = err.code || (err.statusCode === 500 || !err.statusCode ? 'INTERNAL_ERROR' : fallbackErrorCode(err.statusCode || 500));

  // Error-code metrics are recorded centrally in requestLogger's finish hook.
  if (res.locals) res.locals.errorCode = errorCode;

  logger.error('request.error', {
    requestId: req.requestId || getRequestContext().requestId,
    method: req.method,
    route,
    path: req.path,
    durationMs,
    errorCode,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    },
    body: sanitizeRequestBody(req.body)
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Request validation failed', requestId: req.requestId });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, code: 'INVALID_TOKEN', message: 'Invalid authentication token', requestId: req.requestId });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', message: 'Authentication token has expired', requestId: req.requestId });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, code: 'DUPLICATE_ENTRY', message: 'A record with this value already exists', requestId: req.requestId });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, code: 'RECORD_NOT_FOUND', message: 'The requested record was not found', requestId: req.requestId });
  }
  if (err.code === 'P2003') {
    return res.status(409).json({ success: false, code: 'FOREIGN_KEY_CONSTRAINT', message: 'This record is still referenced by another resource', requestId: req.requestId });
  }
  if (err.name === 'MulterError') {
    const isSize = err.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({
      success: false,
      code: isSize ? 'FILE_TOO_LARGE' : 'INVALID_FILE',
      message: isSize
        ? 'Image is too large. Please choose one under 5 MB.'
        : 'Could not read the uploaded file. Please try a different image.',
      requestId: req.requestId
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message: statusCode === 500 ? 'An unexpected error occurred' : err.message,
    requestId: req.requestId
  });
};

export const requestTimeout = (timeoutMs = 30000) => (req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn('request.timeout', {
        requestId: req.requestId,
        method: req.method,
        route: resolveRoutePattern(req),
        path: req.path
      });
      res.status(504).json({ success: false, code: 'REQUEST_TIMEOUT', message: 'Request processing time exceeded limit', requestId: req.requestId });
    }
  }, timeoutMs);

  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));
  next();
};