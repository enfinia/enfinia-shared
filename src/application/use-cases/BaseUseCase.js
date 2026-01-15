const { createLogger } = require('../../infrastructure/logging/pino-logger');

/**
 * Base class for use cases with logging support
 * Use cases orchestrate business logic using ports (repositories, services)
 */
class BaseUseCase {
  /**
   * @param {Object} dependencies - Injected dependencies (repositories, services)
   * @param {Object} [dependencies.logger] - Optional logger instance for correlation ID support
   */
  constructor(dependencies = {}) {
    this.dependencies = dependencies;

    // Extract logger or create a default one
    this.logger = dependencies.logger || createLogger({ service: this.constructor.name });

    // Make dependencies directly accessible (except logger, which is already set)
    Object.keys(dependencies).forEach(key => {
      if (key !== 'logger') {
        this[key] = dependencies[key];
      }
    });
  }

  /**
   * Execute the use case
   * @param {Object} input - Use case input parameters
   * @param {Object} [context] - Optional execution context with correlationId and logger
   * @returns {Promise<Object>} Use case result
   */
  async execute(input, context = {}) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Get a logger with correlation ID bound (if available)
   * @param {Object} context - Execution context with correlationId
   * @returns {Object} Logger instance with correlation ID
   */
  getLogger(context = {}) {
    if (context.correlationId && this.logger.child) {
      return this.logger.child({ correlationId: context.correlationId });
    }
    return this.logger;
  }

  /**
   * Log info message with optional context
   * @param {string} message
   * @param {Object} [data]
   * @param {Object} [context]
   */
  logInfo(message, data = {}, context = {}) {
    const log = this.getLogger(context);
    log.info({ msg: message, ...data, useCase: this.constructor.name });
  }

  /**
   * Log warning message with optional context
   * @param {string} message
   * @param {Object} [data]
   * @param {Object} [context]
   */
  logWarn(message, data = {}, context = {}) {
    const log = this.getLogger(context);
    log.warn({ msg: message, ...data, useCase: this.constructor.name });
  }

  /**
   * Log error message with optional context
   * @param {string} message
   * @param {Error|Object} [error]
   * @param {Object} [context]
   */
  logError(message, error = {}, context = {}) {
    const log = this.getLogger(context);
    const errorData = error instanceof Error
      ? { error: error.message, stack: error.stack }
      : error;
    log.error({ msg: message, ...errorData, useCase: this.constructor.name });
  }

  /**
   * Validate input before execution
   * @param {Object} input
   * @param {Object} schema - Zod schema or validation rules
   */
  validate(input, schema) {
    if (schema && typeof schema.parse === 'function') {
      return schema.parse(input);
    }
    return input;
  }
}

module.exports = BaseUseCase;
