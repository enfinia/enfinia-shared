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
 * Default CORS configuration
 * Allows specific origins and common HTTP methods
 */
const defaultCorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173'];

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
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

  return [
    // Security headers
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false
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

module.exports = {
  createSecurityMiddleware,
  jsonBodyParser,
  securityErrorHandler,
  defaultRateLimitOptions,
  defaultCorsOptions
};
