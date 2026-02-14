/**
 * Tests for Correlation ID Middleware
 */
const { correlationIdMiddleware, getCorrelationId, createCorrelationHeaders, CORRELATION_HEADER } = require('../../src/infrastructure/middleware/correlation-id');

describe('Correlation ID Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      get: jest.fn()
    };
    res = {
      set: jest.fn()
    };
    next = jest.fn();
  });

  describe('correlationIdMiddleware', () => {
    it('should generate a new correlation ID if none provided', () => {
      req.get.mockReturnValue(undefined);

      correlationIdMiddleware(req, res, next);

      expect(req.correlationId).toBeDefined();
      expect(req.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(res.set).toHaveBeenCalledWith(CORRELATION_HEADER, req.correlationId);
      expect(next).toHaveBeenCalled();
    });

    it('should use existing correlation ID from header', () => {
      const existingId = 'existing-correlation-id-123';
      req.get.mockReturnValue(existingId);

      correlationIdMiddleware(req, res, next);

      expect(req.correlationId).toBe(existingId);
      expect(res.set).toHaveBeenCalledWith(CORRELATION_HEADER, existingId);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() to continue middleware chain', () => {
      req.get.mockReturnValue(undefined);

      correlationIdMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCorrelationId', () => {
    it('should return correlation ID from request', () => {
      const testId = 'test-correlation-id';
      req.correlationId = testId;

      const result = getCorrelationId(req);

      expect(result).toBe(testId);
    });

    it('should generate new ID if request has no correlation ID', () => {
      const result = getCorrelationId({});

      expect(result).toBeDefined();
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate new ID if request is undefined', () => {
      const result = getCorrelationId(undefined);

      expect(result).toBeDefined();
    });
  });

  describe('createCorrelationHeaders', () => {
    it('should create headers object with correlation ID', () => {
      const testId = 'test-id-456';

      const headers = createCorrelationHeaders(testId);

      expect(headers).toEqual({
        [CORRELATION_HEADER]: testId
      });
    });
  });

  describe('CORRELATION_HEADER constant', () => {
    it('should be x-correlation-id', () => {
      expect(CORRELATION_HEADER).toBe('x-correlation-id');
    });
  });
});
