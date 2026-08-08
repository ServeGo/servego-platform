import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';

/**
 * Production-grade security middleware configuration
 * Applies multiple layers of protection for the API
 */

// Helmet configuration for secure HTTP headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      // Live maps: OSM raster/vector tile hosts + Google Maps JS/API endpoints
      // when GOOGLE_MAPS_API_KEY is configured. Socket.io uses the same origin.
      connectSrc: [
        "'self'",
        "https://*.tile.openstreetmap.org",
        "https://tile.openstreetmap.org",
        "https://*.maps.googleapis.com",
        "https://maps.googleapis.com",
        "https://*.googleapis.com",
        "https://*.gstatic.com"
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Rate limiter for general API requests
export const generalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Dashboard and catalog reads are frequent (initial hydration, socket
    // refreshes and polling) and must not consume the write-abuse budget.
    // Auth, booking and review routes retain their own stricter limiters.
    return req.path === '/api/health' || ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  }
});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  message: {
    success: false,
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
});

// Rate limiter for booking creation to prevent spam
export const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.BOOKING_RATE_LIMIT_MAX || '5', 10),
  message: {
    success: false,
    code: 'BOOKING_RATE_LIMIT_EXCEEDED',
    message: 'Too many booking requests. Please wait before creating another booking.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Combine user ID with IP for authenticated users
    const userId = req.user?.id || 'anonymous';
    return `${req.ip}-${userId}`;
  }
});

// Rate limiter for review submission
export const reviewRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: {
    success: false,
    code: 'REVIEW_RATE_LIMIT_EXCEEDED',
    message: 'Too many review submissions. Please wait before submitting another review.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Public contact forms are intentionally available without a JWT and need a
// dedicated abuse budget separate from authenticated API traffic.
export const supportTicketRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.SUPPORT_TICKET_RATE_LIMIT_MAX || '5', 10),
  message: { success: false, code: 'SUPPORT_TICKET_RATE_LIMIT_EXCEEDED', message: 'Too many support requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// HPP (HTTP Parameter Pollution) protection
export const hppConfig = hpp({
  whitelist: [
    // Fields that can legitimately appear multiple times
    'serviceIds',
    'categoryIds'
  ]
});
