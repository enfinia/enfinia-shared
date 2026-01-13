/**
 * HTTP Client with Correlation ID propagation
 *
 * Wraps native fetch to automatically include X-Correlation-ID
 * and other standard headers in all outbound requests.
 */
const { CORRELATION_HEADER } = require('../middleware/correlation-id');

/**
 * Create an HTTP client that propagates correlation ID
 * @param {Object} options
 * @param {string} options.correlationId - Correlation ID to propagate
 * @param {string} options.serviceName - Name of the calling service
 * @param {string} options.baseUrl - Optional base URL for all requests
 * @returns {Object} HTTP client with get, post, put, patch, delete methods
 */
function createHttpClient(options = {}) {
  const { correlationId, serviceName, baseUrl = '' } = options;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(correlationId && { [CORRELATION_HEADER]: correlationId }),
    ...(serviceName && { 'X-Service-Name': serviceName })
  };

  async function request(url, fetchOptions = {}) {
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers: {
        ...defaultHeaders,
        ...fetchOptions.headers
      }
    });

    return response;
  }

  async function requestJson(url, fetchOptions = {}) {
    const response = await request(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`HTTP ${response.status}: ${errorText}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  return {
    /**
     * Raw fetch with correlation headers
     */
    fetch: request,

    /**
     * GET request returning parsed JSON
     */
    get: (url, options = {}) =>
      requestJson(url, { ...options, method: 'GET' }),

    /**
     * POST request with JSON body
     */
    post: (url, body, options = {}) =>
      requestJson(url, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body)
      }),

    /**
     * PUT request with JSON body
     */
    put: (url, body, options = {}) =>
      requestJson(url, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(body)
      }),

    /**
     * PATCH request with JSON body
     */
    patch: (url, body, options = {}) =>
      requestJson(url, {
        ...options,
        method: 'PATCH',
        body: JSON.stringify(body)
      }),

    /**
     * DELETE request
     */
    delete: (url, options = {}) =>
      requestJson(url, { ...options, method: 'DELETE' }),

    /**
     * Create a new client with additional/different headers
     */
    withHeaders: (additionalHeaders) =>
      createHttpClient({
        ...options,
        headers: { ...defaultHeaders, ...additionalHeaders }
      })
  };
}

/**
 * Express middleware that attaches an HTTP client to the request
 * The client automatically includes the request's correlation ID
 * @param {Object} options
 * @param {string} options.serviceName - Name of this service
 * @returns {Function} Express middleware
 */
function httpClientMiddleware(options = {}) {
  const { serviceName } = options;

  return (req, res, next) => {
    req.httpClient = createHttpClient({
      correlationId: req.correlationId,
      serviceName
    });
    next();
  };
}

module.exports = {
  createHttpClient,
  httpClientMiddleware
};
