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

export const requestLogger = (req, res, next) => {
  if (req.path === '/api/health') return next();

  const startTime = process.hrtime();
  const requestId = generateRequestId();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const originalEnd = res.end.bind(res);

  res.end = function (chunk, encoding) {
    res.end = originalEnd;
    const result = originalEnd(chunk, encoding);

    const responseTime = getResponseTime(startTime);
    const logLevel = getLogLevel(res.statusCode);

    const logData = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: logLevel,
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query || {}).length > 0 ? req.query : undefined,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      contentLength: res.get('content-length') || 0
    });

    if (logLevel === LOG_LEVELS.ERROR) console.error(logData);
    else if (logLevel === LOG_LEVELS.WARN) console.warn(logData);
    else if (process.env.NODE_ENV !== 'production') console.log(logData);

    return result;
  };

  next();
};

export const errorHandler = (err, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    requestId: req.requestId,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      code: err.code
    },
    method: req.method,
    path: req.path,
    body: sanitizeRequestBody(req.body)
  }));

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
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        requestId: req.requestId,
        message: 'Request timeout',
        method: req.method,
        path: req.path
      }));
      res.status(504).json({ success: false, code: 'REQUEST_TIMEOUT', message: 'Request processing time exceeded limit', requestId: req.requestId });
    }
  }, timeoutMs);

  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));
  next();
};
