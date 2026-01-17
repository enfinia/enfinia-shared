/**
 * Security Middleware Stack
 *
 * Provides helmet, CORS, rate limiting, and request body parsing
 * with sensible defaults for all EnfinIA microservices.
 */
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

/**
 * Default rate limit configuration
 * 100 requests per 15 minutes per IP
 */
const defaultRateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfterSeconds: 900
  }
};

/**
 * Strict rate limit for authentication endpoints
 * 5 attempts per 15 minutes to prevent brute force attacks
 */
const authRateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfterSeconds: 900
  }
};

/**
 * Rate limit for token generation/refresh
 * 10 requests per 15 minutes
 */
const tokenRateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many token requests',
    message: 'Token rate limit exceeded. Please try again later.',
    retryAfterSeconds: 900
  }
};

/**
 * Rate limit for contact/identity operations
 * 20 requests per minute to prevent enumeration attacks
 */
const identityRateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Please slow down your requests.',
    retryAfterSeconds: 60
  }
};

/**
 * Default CORS configuration
 * Restricts origins based on environment - no wildcards in production
 */
const defaultCorsOptions = {
  origin: (origin, callback) => {
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, reject requests without origin (CSRF protection)
    if (!origin) {
      if (isProduction) {
        return callback(new Error('Origin header required'));
      }
      // Allow no-origin only in development for testing tools
      return callback(null, true);
    }

    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173'];

    // Reject wildcard in production
    if (isProduction && allowedOrigins.includes('*')) {
      return callback(new Error('Wildcard origin not allowed in production'));
    }

    if (allowedOrigins.includes(origin) || (!isProduction && allowedOrigins.includes('*'))) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Service-Name']
};

/**
 * Create security middleware stack with custom options
 * @param {Object} options - Configuration options
 * @param {Object} options.rateLimit - Rate limit options (overrides defaults)
 * @param {Object} options.cors - CORS options (overrides defaults)
 * @param {string} options.bodyLimit - JSON body size limit (default: '10kb')
 * @returns {Array} Array of middleware functions
 */
function createSecurityMiddleware(options = {}) {
  const {
    rateLimit: rateLimitOpts = {},
    cors: corsOpts = {},
    bodyLimit = '10kb'
  } = options;

  const isProduction = process.env.NODE_ENV === 'production';

  return [
    // Security headers with strict configuration
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      hsts: isProduction ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true
    }),

    // CORS
    cors({ ...defaultCorsOptions, ...corsOpts }),

    // Rate limiting
    rateLimit({ ...defaultRateLimitOptions, ...rateLimitOpts })
  ];
}

/**
 * JSON body parser with size limit
 * @param {string} limit - Body size limit (default: '10kb')
 * @returns {Function} Express middleware
 */
function jsonBodyParser(limit = '10kb') {
  const express = require('express');
  return express.json({ limit });
}

/**
 * Error handler for security-related errors
 */
function securityErrorHandler(err, req, res, next) {
  if (err.message === 'CORS not allowed for this origin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Cross-origin request blocked'
    });
  }

  next(err);
}

/**
 * Create rate limiter for authentication endpoints
 * @returns {Function} Express rate limiting middleware
 */
function createAuthRateLimiter() {
  return rateLimit(authRateLimitOptions);
}

/**
 * Create rate limiter for token operations
 * @returns {Function} Express rate limiting middleware
 */
function createTokenRateLimiter() {
  return rateLimit(tokenRateLimitOptions);
}

/**
 * Create rate limiter for identity/contact operations
 * @returns {Function} Express rate limiting middleware
 */
function createIdentityRateLimiter() {
  return rateLimit(identityRateLimitOptions);
}

module.exports = {
  createSecurityMiddleware,
  jsonBodyParser,
  securityErrorHandler,
  defaultRateLimitOptions,
  defaultCorsOptions,
  authRateLimitOptions,
  tokenRateLimitOptions,
  identityRateLimitOptions,
  createAuthRateLimiter,
  createTokenRateLimiter,
  createIdentityRateLimiter
};
