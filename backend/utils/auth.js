import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import process from 'node:process';
import { setRequestUser } from './telemetry/requestContext.js';
import { isAccessTokenRevoked } from './accessRevocation.js';

dotenv.config();

const DEFAULT_DEV_SECRET = 'servego-dev-secret';
const isProduction = process.env.NODE_ENV === 'production';

// Single source of truth for the JWT signing secrets. In production a missing
// or weak secret must stop the server instead of silently using the public
// dev fallback (which would let anyone forge tokens). Local/test environments
// keep the fallback so the dev workflow and test suite work unchanged.
function resolveSecret(key, devFallback) {
  const value = process.env[key]?.trim();
  if (value && value.length >= 16) return value;
  if (isProduction) {
    throw new Error(`[Auth] ${key} is not set — refusing to boot in production. Set a strong ${key} in the deploy environment.`);
  }
  console.warn(`[Auth] ${key} not set — using the insecure development fallback. Set ${key} before deploying to production.`);
  return devFallback;
}

export const SECRET = resolveSecret('JWT_SECRET', DEFAULT_DEV_SECRET);
export const REFRESH_SECRET = resolveSecret('JWT_REFRESH_SECRET', `${DEFAULT_DEV_SECRET}-refresh`);
// Exported so the API can report the real access-token lifetime. Clients use
// `expiresIn` to decide when to preemptively refresh; a value that disagreed
// with the signing config would have them refreshing early or far too late.
export const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || '15m';
export const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Hard ceiling on a session's life, in ms. The refresh JWT already expires on its
// own, but `RefreshSession.absoluteExpiry` is enforced from the row so a session
// can be capped below the token lifetime without touching signing config.
export const REFRESH_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate access token with standard claims
 */
export function generateAuthToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
    email: user.email,
    iat: Math.floor(Date.now() / 1000)
  };
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate refresh token for token renewal.
 *
 * The `jti` is what makes the token revocable: it is the primary key of the
 * `RefreshSession` row, so the server can look the token up and refuse it once
 * the row is revoked. It also fixes a real weakness of the old payload
 * (`{ id, type, iat }`): signing is deterministic, so two refreshes inside the
 * same second produced a byte-identical token. Callers that manage sessions pass
 * their own `jti` so the token and the row are minted together; it is generated
 * here only as a fallback for callers that don't.
 */
export function generateRefreshToken(user, { jti } = {}) {
  const payload = {
    id: user.id,
    type: 'refresh',
    jti: jti || crypto.randomBytes(32).toString('hex'),
    iat: Math.floor(Date.now() / 1000)
  };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Generate both access and refresh tokens.
 */
export function generateTokenPair(user, { jti } = {}) {
  return {
    accessToken: generateAuthToken(user),
    refreshToken: generateRefreshToken(user, { jti }),
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_EXPIRY
  };
}

/**
 * Build the token payload the API returns from login, register and refresh.
 *
 * The refresh token is supplied by the caller, never minted here: it has to be
 * the exact token whose hash was stored in the `RefreshSession` row, so signing
 * a second one here would persist a hash no client ever receives.
 */
export function buildAuthResponse(user, refreshToken) {
  return {
    accessToken: generateAuthToken(user),
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_EXPIRY
  };
}

/**
 * Verify access token
 */
export function verifyAuthToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SECRET);
    // Ensure token is not expired (jwt.verify handles this, but explicit check)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { expired: true, message: 'Token has expired' };
    }
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader) {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Basic authentication middleware - requires valid token
 */
export function requireAuth(req, res, next) {
  const header = req.headers?.authorization || '';
  const token = extractToken(header);
  const decoded = verifyAuthToken(token);

  if (!decoded || decoded.expired) {
    return res.status(401).json({ 
      success: false, 
      code: 'UNAUTHORIZED', 
      message: 'Authentication required.',
      expired: decoded?.expired || false
    });
  }

  // The signature is valid, but this token was issued before the account was
  // revoked (logout-everywhere, password reset, admin block). Refusing it here
  // is what closes the 15-minute window an already-issued access token would
  // otherwise stay valid for. The reason is reported separately from a plain
  // 401 so the client can say "you were signed out" instead of "please log in".
  if (isAccessTokenRevoked(decoded)) {
    return res.status(401).json({
      success: false,
      code: 'SESSION_REVOKED',
      message: 'Your session has been ended. Please sign in again.'
    });
  }

  req.user = decoded;
  setRequestUser(decoded.id, decoded.role);
  return next();
}

/**
 * Role-based access control middleware
 * Must be used after requireAuth — relies on req.user already being set.
 */
export function requireRole(roleOrRoles) {
  const allowedRoles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        code: 'UNAUTHORIZED', 
        message: 'Authentication required.' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        code: 'FORBIDDEN', 
        message: 'You do not have permission to perform this action.' 
      });
    }

    return next();
  };
}

/**
 * Optional authentication - populates req.user if valid token present
 * Does not block request if no token
 */
export function optionalAuth(req, res, next) {
  const header = req.headers?.authorization || '';
  const token = extractToken(header);
  
  if (token) {
    const decoded = verifyAuthToken(token);
    // A revoked token is treated exactly as a missing one: `optionalAuth` must
    // not hand a dead session to a handler as though it were authenticated.
    if (decoded && !decoded.expired && !isAccessTokenRevoked(decoded)) {
      req.user = decoded;
      setRequestUser(decoded.id, decoded.role);
    }
  }
  
  return next();
}

/**
 * Rate limit helper - track failed auth attempts per IP
 */
const failedAttempts = new Map();

export function recordFailedAuthAttempt(ip) {
  const key = `auth:${ip}`;
  const current = failedAttempts.get(key) || 0;
  failedAttempts.set(key, current + 1);
  
  // Clear after 15 minutes
  const decayTimer = setTimeout(() => {
    const val = failedAttempts.get(key);
    if (val) {
      failedAttempts.set(key, Math.max(0, val - 1));
    }
  }, 15 * 60 * 1000);
  // These housekeeping timers must not keep the server or test process alive.
  decayTimer.unref?.();
}

export function getFailedAuthAttempts(ip) {
  return failedAttempts.get(`auth:${ip}`) || 0;
}

export function isAuthBlocked(ip, maxAttempts = 5) {
  return getFailedAuthAttempts(ip) >= maxAttempts;
}
