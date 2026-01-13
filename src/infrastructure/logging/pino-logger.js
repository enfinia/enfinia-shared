/**
 * Pino Logger with Correlation ID support
 *
 * Structured JSON logging for production observability
 */
const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Create a Pino logger instance with default configuration
 * @param {Object} options - Logger options
 * @param {string} options.service - Service name for log identification
 * @param {string} options.level - Log level (default: info)
 * @returns {pino.Logger}
 */
function createLogger(options = {}) {
  const { service = 'unknown-service', level = 'info' } = options;

  const config = {
    level: isTest ? 'silent' : (process.env.LOG_LEVEL || level),
    base: {
      service,
      pid: process.pid,
      env: process.env.NODE_ENV || 'development'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label.toUpperCase() })
    }
  };

  // Pretty print in development
  if (!isProduction && !isTest) {
    config.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    };
  }

  return pino(config);
}

/**
 * Create a child logger with correlation ID bound
 * @param {pino.Logger} logger - Parent logger
 * @param {string} correlationId - Correlation ID to bind
 * @returns {pino.Logger}
 */
function withCorrelationId(logger, correlationId) {
  return logger.child({ correlationId });
}

/**
 * Create a child logger with request context
 * @param {pino.Logger} logger - Parent logger
 * @param {Object} req - Express request object
 * @returns {pino.Logger}
 */
function withRequestContext(logger, req) {
  return logger.child({
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    userAgent: req.get('user-agent')
  });
}

/**
 * Express middleware for request logging
 * @param {pino.Logger} logger - Pino logger instance
 * @returns {Function} Express middleware
 */
function requestLoggerMiddleware(logger) {
  return (req, res, next) => {
    const startTime = Date.now();
    const reqLogger = withRequestContext(logger, req);

    // Attach logger to request for use in handlers
    req.log = reqLogger;

    reqLogger.info({ msg: 'Request started' });

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      reqLogger.info({
        msg: 'Request completed',
        statusCode: res.statusCode,
        durationMs
      });
    });

    next();
  };
}

module.exports = {
  createLogger,
  withCorrelationId,
  withRequestContext,
  requestLoggerMiddleware
};
