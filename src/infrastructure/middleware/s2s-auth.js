/**
 * S2S Authentication Middleware
 *
 * Verifies JWT tokens for service-to-service communication.
 * Requires Authorization header with Bearer token.
 */
const jwt = require('jsonwebtoken');

/**
 * Create S2S authentication middleware
 * @param {Object} options
 * @param {string} options.jwtSecret - Secret key for verifying JWTs
 * @param {Array<string>} options.excludePaths - Paths to exclude from auth (e.g., ['/health'])
 * @returns {Function} Express middleware
 */
function createS2SAuthMiddleware(options = {}) {
  const {
    jwtSecret = process.env.S2S_JWT_SECRET,
    excludePaths = ['/health', '/healthz', '/ready', '/metrics']
  } = options;

  if (!jwtSecret) {
    throw new Error('S2S_JWT_SECRET is required for S2S authentication middleware');
  }

  return (req, res, next) => {
    // Skip auth for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.get('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header required'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization format. Use: Bearer <token>'
      });
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, jwtSecret);

      // Verify it's an access token
      if (payload.type !== 'access') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token type'
        });
      }

      // Attach service info to request
      req.service = {
        name: payload.service,
        authenticated: true
      };

      // Add service name header for logging
      res.set('X-Authenticated-Service', payload.service);

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
  };
}

/**
 * Optional S2S auth middleware
 * Validates token if present, but doesn't require it
 * Useful for endpoints that can be called by both services and users
 */
function createOptionalS2SAuthMiddleware(options = {}) {
  const { jwtSecret = process.env.S2S_JWT_SECRET } = options;

  return (req, res, next) => {
    const authHeader = req.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.service = { authenticated: false };
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, jwtSecret);

      if (payload.type === 'access') {
        req.service = {
          name: payload.service,
          authenticated: true
        };
      } else {
        req.service = { authenticated: false };
      }
    } catch (error) {
      req.service = { authenticated: false };
    }

    next();
  };
}

module.exports = {
  createS2SAuthMiddleware,
  createOptionalS2SAuthMiddleware
};
