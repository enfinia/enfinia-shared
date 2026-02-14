/**
 * Tests for S2S Auth Middleware
 */
const { createS2SAuthMiddleware, createOptionalS2SAuthMiddleware } = require('../../src/infrastructure/middleware/s2s-auth');
const { S2STokenGenerator } = require('../../src/adapters/auth/s2s-client');

describe('S2S Auth Middleware', () => {
  let tokenGenerator;
  let validToken;

  beforeAll(() => {
    tokenGenerator = new S2STokenGenerator('test-jwt-secret-key-for-testing-only');
    const tokens = tokenGenerator.generateTokens('test-service');
    validToken = tokens.accessToken;
  });

  describe('createS2SAuthMiddleware', () => {
    let middleware;
    let req, res, next;

    beforeEach(() => {
      middleware = createS2SAuthMiddleware({
        jwtSecret: 'test-jwt-secret-key-for-testing-only'
      });
      req = {
        path: '/api/data',
        get: jest.fn()
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn()
      };
      next = jest.fn();
    });

    it('should throw error if no JWT secret configured', () => {
      const originalEnv = process.env.S2S_JWT_SECRET;
      delete process.env.S2S_JWT_SECRET;

      expect(() => createS2SAuthMiddleware({})).toThrow('S2S_JWT_SECRET is required');

      process.env.S2S_JWT_SECRET = originalEnv;
    });

    it('should skip auth for health check paths', () => {
      req.path = '/health';

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip auth for /healthz path', () => {
      req.path = '/healthz';

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip auth for /ready path', () => {
      req.path = '/ready';

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject request without Authorization header', () => {
      req.get.mockReturnValue(undefined);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized',
        message: 'Authorization header required'
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization format', () => {
      req.get.mockReturnValue('Basic abc123');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid authorization format. Use: Bearer <token>'
      }));
    });

    it('should reject request with invalid token', () => {
      req.get.mockReturnValue('Bearer invalid-token');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid token'
      }));
    });

    it('should accept request with valid token', () => {
      req.get.mockReturnValue(`Bearer ${validToken}`);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.service).toEqual({
        name: 'test-service',
        authenticated: true
      });
      expect(res.set).toHaveBeenCalledWith('X-Authenticated-Service', 'test-service');
    });

    it('should reject refresh token as access token', () => {
      const { refreshToken } = tokenGenerator.generateTokens('test-service');
      req.get.mockReturnValue(`Bearer ${refreshToken}`);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid token type'
      }));
    });
  });

  describe('createOptionalS2SAuthMiddleware', () => {
    let middleware;
    let req, res, next;

    beforeEach(() => {
      middleware = createOptionalS2SAuthMiddleware({
        jwtSecret: 'test-jwt-secret-key-for-testing-only'
      });
      req = {
        get: jest.fn()
      };
      res = {};
      next = jest.fn();
    });

    it('should set authenticated false if no header', () => {
      req.get.mockReturnValue(undefined);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.service).toEqual({ authenticated: false });
    });

    it('should set authenticated false if invalid token', () => {
      req.get.mockReturnValue('Bearer invalid-token');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.service).toEqual({ authenticated: false });
    });

    it('should set authenticated true with valid token', () => {
      req.get.mockReturnValue(`Bearer ${validToken}`);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.service).toEqual({
        name: 'test-service',
        authenticated: true
      });
    });

    it('should always call next even with invalid token', () => {
      req.get.mockReturnValue('Bearer invalid');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
