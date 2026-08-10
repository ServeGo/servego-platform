import process from 'node:process';

export function resolvePort(portValue, fallback = 4000) {
  const parsed = Number.parseInt(portValue ?? '', 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

export function parseAllowedOrigins(value) {
  if (!value) {
    return ['*'];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getCorsConfig() {
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  const isWildcard = allowedOrigins.includes('*');

  return {
    origin: isWildcard ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  };
}
