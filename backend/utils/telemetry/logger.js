import { getRequestContext } from './requestContext.js';

/**
 * Structured JSON logger. Every entry is one machine-readable JSON line to
 * stdout/stderr (never the DB) and automatically carries the request context
 * (`requestId`, `userId`, `role`) when emitted inside a request or a queue job
 * that re-seeded the ALS context.
 *
 * Entry shape: { ts, level, event, requestId, userId, role, ...fields }
 */
const SENSITIVE_FIELDS = ['password', 'confirmPassword', 'token', 'refreshToken', 'apiKey', 'secret'];

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redact(val);
      }
    }
    return out;
  }
  return value;
}

export function log(level, event, fields = {}) {
  const ctx = getRequestContext();
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    requestId: ctx.requestId || null,
    userId: ctx.userId || null,
    role: ctx.role || null
  };
  for (const [key, value] of Object.entries(fields || {})) {
    entry[key] = redact(value);
  }
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event, fields) => log('info', event, fields),
  warn: (event, fields) => log('warn', event, fields),
  error: (event, fields) => log('error', event, fields)
};

export default logger;