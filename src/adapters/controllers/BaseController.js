const { createLogger } = require('../../infrastructure/logging/pino-logger');

/**
 * Base class for HTTP controllers
 * Controllers translate HTTP requests to use case calls
 */
class BaseController {
  constructor(dependencies = {}) {
    const { logger, ...rest } = dependencies;
    Object.keys(rest).forEach(key => {
      this[key] = rest[key];
    });
    this.logger = logger || createLogger({ service: this.constructor.name });
  }

  /**
   * Send success response
   */
  success(res, data, status = 200) {
    return res.status(status).json(data);
  }

  /**
   * Send error response
   */
  error(res, message, status = 500, code = null) {
    const response = { error: message };
    if (code) response.code = code;
    return res.status(status).json(response);
  }

  /**
   * Get correlation ID from request
   */
  getCorrelationId(req) {
    return req.headers['x-correlation-id'] || req.correlationId || null;
  }

  /**
   * Get child logger with correlation ID
   */
  getLogger(req) {
    const correlationId = this.getCorrelationId(req);
    if (correlationId) {
      return this.logger.child({ correlationId });
    }
    return this.logger;
  }

  /**
   * Log info with correlation ID
   */
  logInfo(message, data = {}, req = null) {
    const logger = req ? this.getLogger(req) : this.logger;
    logger.info({ msg: message, ...data });
  }

  /**
   * Log warning with correlation ID
   */
  logWarn(message, data = {}, req = null) {
    const logger = req ? this.getLogger(req) : this.logger;
    logger.warn({ msg: message, ...data });
  }

  /**
   * Log error with correlation ID
   */
  logError(message, data = {}, req = null) {
    const logger = req ? this.getLogger(req) : this.logger;
    logger.error({ msg: message, ...data });
  }

  /**
   * Handle use case execution with error handling
   */
  async handle(res, useCase, input, req = null) {
    try {
      const context = req ? { correlationId: this.getCorrelationId(req) } : {};
      const result = await useCase.execute(input, context);
      return this.success(res, result);
    } catch (err) {
      this.logError('Controller error', { error: err.message }, req);

      if (err.name === 'ZodError') {
        return this.error(res, err.errors[0].message, 400, 'VALIDATION_ERROR');
      }

      return this.error(res, 'Erro interno do servidor');
    }
  }
}

module.exports = BaseController;
