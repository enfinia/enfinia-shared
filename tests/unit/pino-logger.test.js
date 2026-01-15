const {
  createLogger,
  withCorrelationId,
  withRequestContext,
  requestLoggerMiddleware
} = require('../../src/infrastructure/logging/pino-logger');

describe('Pino Logger', () => {
  describe('createLogger', () => {
    it('should create a logger with default options', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it('should create a logger with custom service name', () => {
      const logger = createLogger({ service: 'test-service' });
      expect(logger).toBeDefined();
    });

    it('should create a logger with custom log level', () => {
      const logger = createLogger({ level: 'debug' });
      expect(logger).toBeDefined();
    });
  });

  describe('withCorrelationId', () => {
    it('should create child logger with correlation ID', () => {
      const logger = createLogger({ service: 'test' });
      const childLogger = withCorrelationId(logger, 'test-correlation-id');
      expect(childLogger).toBeDefined();
      expect(childLogger.info).toBeDefined();
    });
  });

  describe('withRequestContext', () => {
    it('should create child logger with request context', () => {
      const logger = createLogger({ service: 'test' });
      const mockReq = {
        correlationId: 'req-correlation-id',
        method: 'GET',
        path: '/api/test',
        get: jest.fn().mockReturnValue('test-user-agent')
      };

      const childLogger = withRequestContext(logger, mockReq);
      expect(childLogger).toBeDefined();
    });
  });

  describe('requestLoggerMiddleware', () => {
    it('should attach logger to request', () => {
      const logger = createLogger({ service: 'test' });
      const middleware = requestLoggerMiddleware(logger);

      const mockReq = {
        correlationId: 'test-id',
        method: 'POST',
        path: '/api/users',
        get: jest.fn().mockReturnValue('test-agent')
      };
      const mockRes = {
        on: jest.fn()
      };
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.log).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should log request completion on response finish', () => {
      const logger = createLogger({ service: 'test' });
      const middleware = requestLoggerMiddleware(logger);

      const mockReq = {
        correlationId: 'test-id',
        method: 'GET',
        path: '/api/test',
        get: jest.fn()
      };

      let finishCallback;
      const mockRes = {
        on: jest.fn((event, cb) => {
          if (event === 'finish') finishCallback = cb;
        }),
        statusCode: 200,
        get: jest.fn().mockReturnValue(null)
      };
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      // Simulate response finish
      expect(finishCallback).toBeDefined();
      finishCallback();
    });
  });
});
