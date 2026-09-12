import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.JWT_SECRET || 'servego-dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${SECRET}-refresh`;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

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
 * Generate refresh token for token renewal
 */
export function generateRefreshToken(user) {
  const payload = {
    id: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(user) {
  return {
    accessToken: generateAuthToken(user),
    refreshToken: generateRefreshToken(user),
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

  req.user = decoded;
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
    if (decoded && !decoded.expired) {
      req.user = decoded;
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
