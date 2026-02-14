/**
 * Supabase Client Factory
 *
 * Provides a structured, configurable Supabase client for all EnfinIA microservices.
 * Supports correlation ID propagation and service identification.
 */
const { createClient } = require('@supabase/supabase-js');

/**
 * Default Supabase client options
 */
const defaultOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
};

/**
 * Create a Supabase client instance
 *
 * @param {Object} options - Configuration options
 * @param {string} options.url - Supabase project URL (defaults to SUPABASE_URL env var)
 * @param {string} options.key - Supabase API key (defaults to SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY env var)
 * @param {string} options.serviceName - Name of the calling service for X-Client-Info header
 * @param {string} options.correlationId - Correlation ID for request tracing
 * @param {Object} options.clientOptions - Additional Supabase client options
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createSupabaseClient(options = {}) {
  const {
    url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceName = 'enfinia-service',
    correlationId,
    clientOptions = {}
  } = options;

  if (!url) {
    throw new Error('Supabase URL is required. Set SUPABASE_URL environment variable or pass url option.');
  }

  if (!key) {
    throw new Error('Supabase API key is required. Set SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable or pass key option.');
  }

  const headers = {
    'X-Client-Info': `enfinia-shared/${serviceName}`,
    ...(correlationId && { 'X-Correlation-ID': correlationId })
  };

  return createClient(url, key, {
    ...defaultOptions,
    ...clientOptions,
    global: {
      ...clientOptions.global,
      headers: {
        ...headers,
        ...clientOptions.global?.headers
      }
    }
  });
}

/**
 * Get or create a singleton Supabase client
 * Useful for services that need a shared client instance
 */
let singletonClient = null;

function getSupabaseClient(options = {}) {
  if (!singletonClient) {
    singletonClient = createSupabaseClient(options);
  }
  return singletonClient;
}

/**
 * Reset the singleton client (useful for testing)
 */
function resetSupabaseClient() {
  singletonClient = null;
}

/**
 * Create a Supabase client with correlation ID from Express request
 * Use this when you need per-request correlation ID tracking
 *
 * @param {Object} req - Express request object with correlationId
 * @param {Object} options - Additional options
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createRequestScopedClient(req, options = {}) {
  return createSupabaseClient({
    ...options,
    correlationId: req.correlationId
  });
}

/**
 * Express middleware that attaches a Supabase client to the request
 * The client automatically includes the request's correlation ID
 *
 * @param {Object} options
 * @param {string} options.serviceName - Name of this service
 * @param {boolean} options.perRequest - If true, creates a new client per request (default: false)
 * @returns {Function} Express middleware
 */
function supabaseMiddleware(options = {}) {
  const { serviceName, perRequest = false } = options;

  // For non per-request mode, create a shared client
  const sharedClient = perRequest ? null : getSupabaseClient({ serviceName });

  return (req, res, next) => {
    if (perRequest) {
      // Create a new client with correlation ID for this request
      req.supabase = createRequestScopedClient(req, { serviceName });
    } else {
      // Use shared client (correlation ID in headers won't be request-specific)
      req.supabase = sharedClient;
    }
    next();
  };
}

/**
 * Database health check - verify Supabase connection
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} client - Supabase client to check
 * @returns {Promise<{healthy: boolean, latencyMs: number, error?: string}>}
 */
async function checkDatabaseHealth(client) {
  const startTime = Date.now();

  try {
    // Simple query to verify connection
    const { error } = await client
      .from('_health_check')
      .select('1')
      .limit(1)
      .maybeSingle();

    // Table might not exist, but connection should work
    // Only fail if it's a connection error
    if (error && error.code === 'PGRST116') {
      // Table not found - this is OK, connection works
      return {
        healthy: true,
        latencyMs: Date.now() - startTime
      };
    }

    if (error && error.code !== '42P01') {
      // Real error (not "table does not exist")
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        error: error.message
      };
    }

    return {
      healthy: true,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      error: error.message
    };
  }
}

module.exports = {
  createSupabaseClient,
  getSupabaseClient,
  resetSupabaseClient,
  createRequestScopedClient,
  supabaseMiddleware,
  checkDatabaseHealth,
  defaultOptions
};
