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
 * @param {string} options.service - Service name for log identification (aliases: serviceName, name)
 * @param {string} options.level - Log level (default: info, or LOG_LEVEL env var)
 * @param {string} options.version - Service version (optional, defaults to SERVICE_VERSION env var)
 * @returns {pino.Logger}
 */
function createLogger(options = {}) {
  // Support aliases for service name for backward compatibility
  const service = options.service || options.serviceName || options.name || 'unknown-service';
  const level = options.level || 'info';
  const version = options.version || process.env.SERVICE_VERSION || '1.0.0';

  const config = {
    level: isTest ? 'silent' : (process.env.LOG_LEVEL || level),
    base: {
      service,
      version,
      pid: process.pid,
      hostname: process.env.HOSTNAME || require('os').hostname(),
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
 * Express middleware for request logging with enhanced observability
 * @param {pino.Logger} logger - Pino logger instance
 * @param {Object} options - Middleware options
 * @param {boolean} options.logRequestBody - Log request body (default: false for security)
 * @param {boolean} options.logResponseBody - Log response body (default: false for security)
 * @param {string[]} options.ignorePaths - Paths to exclude from logging (e.g., ['/health', '/ready'])
 * @returns {Function} Express middleware
 */
function requestLoggerMiddleware(logger, options = {}) {
  const {
    logRequestBody = false,
    logResponseBody = false,
    ignorePaths = ['/health', '/healthz', '/ready', '/metrics']
  } = options;

  return (req, res, next) => {
    // Skip logging for ignored paths
    if (ignorePaths.includes(req.path)) {
      return next();
    }

    const startTime = Date.now();
    const startHrTime = process.hrtime.bigint();
    const reqLogger = withRequestContext(logger, req);

    // Attach logger to request for use in handlers
    req.log = reqLogger;

    // Enhanced request logging
    const requestLog = {
      msg: 'Request started',
      requestId: req.correlationId,
      ip: req.ip || req.connection?.remoteAddress,
      contentLength: req.get('content-length'),
      contentType: req.get('content-type')
    };

    // Optionally log request body (be careful with sensitive data)
    if (logRequestBody && req.body && Object.keys(req.body).length > 0) {
      requestLog.body = sanitizeLogData(req.body);
    }

    reqLogger.info(requestLog);

    // Capture response data
    const originalSend = res.send;
    let responseBody;

    res.send = function(body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const durationNs = Number(process.hrtime.bigint() - startHrTime);

      const responseLog = {
        msg: 'Request completed',
        requestId: req.correlationId,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        durationMs,
        durationNs,
        contentLength: res.get('content-length')
      };

      // Optionally log response body (be careful with sensitive data)
      if (logResponseBody && responseBody) {
        try {
          const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
          responseLog.body = sanitizeLogData(parsed);
        } catch {
          // Response is not JSON, skip body logging
        }
      }

      // Use appropriate log level based on status code
      if (res.statusCode >= 500) {
        reqLogger.error(responseLog);
      } else if (res.statusCode >= 400) {
        reqLogger.warn(responseLog);
      } else {
        reqLogger.info(responseLog);
      }
    });

    res.on('error', (err) => {
      reqLogger.error({
        msg: 'Response error',
        requestId: req.correlationId,
        error: err.message,
        stack: err.stack
      });
    });

    next();
  };
}

/**
 * Sanitize log data to remove sensitive fields
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password', 'senha', 'token', 'accessToken', 'refreshToken',
    'authorization', 'apiKey', 'api_key', 'secret', 'credential',
    'cpf', 'ssn', 'creditCard', 'cardNumber', 'cvv', 'pin'
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

module.exports = {
  createLogger,
  withCorrelationId,
  withRequestContext,
  requestLoggerMiddleware,
  sanitizeLogData
};
