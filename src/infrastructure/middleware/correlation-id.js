/**
 * Correlation ID Middleware
 *
 * Generates or propagates X-Correlation-ID header for request tracing
 * across all microservices.
 */
const { v4: uuidv4 } = require('uuid');

const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Middleware that ensures every request has a correlation ID
 * - If X-Correlation-ID header exists, use it
 * - Otherwise, generate a new UUID v4
 * - Attach to req.correlationId for easy access
 * - Set response header for client visibility
 */
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.get(CORRELATION_HEADER) || uuidv4();

  req.correlationId = correlationId;
  res.set(CORRELATION_HEADER, correlationId);

  next();
}

/**
 * Get correlation ID from async local storage or generate new one
 * Useful for non-Express contexts
 */
function getCorrelationId(req) {
  return req?.correlationId || uuidv4();
}

/**
 * Create headers object with correlation ID for outbound requests
 * @param {string} correlationId - The correlation ID to propagate
 * @returns {Object} Headers object with X-Correlation-ID
 */
function createCorrelationHeaders(correlationId) {
  return {
    [CORRELATION_HEADER]: correlationId
  };
}

module.exports = {
  correlationIdMiddleware,
  getCorrelationId,
  createCorrelationHeaders,
  CORRELATION_HEADER
};
