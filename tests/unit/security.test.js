/**
 * Tests for Security Middleware
 */
const { createSecurityMiddleware, securityErrorHandler, defaultRateLimitOptions } = require('../../src/infrastructure/middleware/security');

describe('Security Middleware', () => {
  describe('createSecurityMiddleware', () => {
    it('should return an array of middleware functions', () => {
      const middlewares = createSecurityMiddleware();

      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares.length).toBe(3); // helmet, cors, rateLimit
      middlewares.forEach(mw => {
        expect(typeof mw).toBe('function');
      });
    });

    it('should accept custom rate limit options', () => {
      const customOptions = {
        rateLimit: {
          max: 50,
          windowMs: 60000
        }
      };

      const middlewares = createSecurityMiddleware(customOptions);

      expect(middlewares.length).toBe(3);
    });

    it('should accept custom CORS options', () => {
      const customOptions = {
        cors: {
          origin: 'https://example.com'
        }
      };

      const middlewares = createSecurityMiddleware(customOptions);

      expect(middlewares.length).toBe(3);
    });
  });

  describe('securityErrorHandler', () => {
    let req, res, next;

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should handle CORS error', () => {
      const error = new Error('CORS not allowed for this origin');

      securityErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Cross-origin request blocked'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass other errors to next handler', () => {
      const error = new Error('Some other error');

      securityErrorHandler(error, req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('defaultRateLimitOptions', () => {
    it('should have sensible defaults', () => {
      expect(defaultRateLimitOptions.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(defaultRateLimitOptions.max).toBe(100);
      expect(defaultRateLimitOptions.standardHeaders).toBe(true);
      expect(defaultRateLimitOptions.legacyHeaders).toBe(false);
    });

    it('should have error message configured', () => {
      expect(defaultRateLimitOptions.message).toHaveProperty('error');
      expect(defaultRateLimitOptions.message).toHaveProperty('message');
    });
  });

  describe('jsonBodyParser', () => {
    const { jsonBodyParser } = require('../../src/infrastructure/middleware/security');

    it('should return a middleware function', () => {
      const parser = jsonBodyParser();
      expect(typeof parser).toBe('function');
    });

    it('should accept custom limit', () => {
      const parser = jsonBodyParser('50kb');
      expect(typeof parser).toBe('function');
    });
  });

  describe('defaultCorsOptions', () => {
    const { defaultCorsOptions } = require('../../src/infrastructure/middleware/security');

    it('should allow requests with no origin', () => {
      const callback = jest.fn();
      defaultCorsOptions.origin(undefined, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow requests from allowed origins', () => {
      const callback = jest.fn();
      // Default localhost should be allowed
      defaultCorsOptions.origin('http://localhost:3000', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should reject requests from disallowed origins', () => {
      const callback = jest.fn();
      defaultCorsOptions.origin('https://malicious-site.com', callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should allow wildcard when configured', () => {
      // Store original env
      const originalEnv = process.env.CORS_ALLOWED_ORIGINS;
      process.env.CORS_ALLOWED_ORIGINS = '*';

      // Need to re-require to pick up new env
      jest.resetModules();
      const { defaultCorsOptions: freshOptions } = require('../../src/infrastructure/middleware/security');

      const callback = jest.fn();
      freshOptions.origin('https://any-origin.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);

      // Restore original env
      process.env.CORS_ALLOWED_ORIGINS = originalEnv;
    });
  });
});
