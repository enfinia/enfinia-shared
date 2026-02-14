/**
 * Tests for Supabase Client
 */
const {
  createSupabaseClient,
  getSupabaseClient,
  resetSupabaseClient,
  createRequestScopedClient,
  supabaseMiddleware,
  checkDatabaseHealth
} = require('../../src/infrastructure/database/supabase-client');

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation((url, key, options) => ({
    url,
    key,
    options,
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn()
  }))
}));

const { createClient } = require('@supabase/supabase-js');

describe('Supabase Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSupabaseClient();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_KEY: 'test-key'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createSupabaseClient', () => {
    it('should create client with environment variables', () => {
      const client = createSupabaseClient();

      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: false
          })
        })
      );
    });

    it('should create client with custom options', () => {
      const client = createSupabaseClient({
        url: 'https://custom.supabase.co',
        key: 'custom-key',
        serviceName: 'my-service'
      });

      expect(createClient).toHaveBeenCalledWith(
        'https://custom.supabase.co',
        'custom-key',
        expect.objectContaining({
          global: expect.objectContaining({
            headers: expect.objectContaining({
              'X-Client-Info': 'enfinia-shared/my-service'
            })
          })
        })
      );
    });

    it('should include correlation ID in headers when provided', () => {
      createSupabaseClient({
        correlationId: 'test-correlation-id'
      });

      expect(createClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          global: expect.objectContaining({
            headers: expect.objectContaining({
              'X-Correlation-ID': 'test-correlation-id'
            })
          })
        })
      );
    });

    it('should throw error if URL is missing', () => {
      delete process.env.SUPABASE_URL;

      expect(() => createSupabaseClient()).toThrow('Supabase URL is required');
    });

    it('should throw error if key is missing', () => {
      delete process.env.SUPABASE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createSupabaseClient()).toThrow('Supabase API key is required');
    });

    it('should fallback to SUPABASE_SERVICE_ROLE_KEY', () => {
      delete process.env.SUPABASE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

      createSupabaseClient();

      expect(createClient).toHaveBeenCalledWith(
        expect.any(String),
        'service-role-key',
        expect.any(Object)
      );
    });
  });

  describe('getSupabaseClient', () => {
    it('should return singleton client', () => {
      const client1 = getSupabaseClient();
      const client2 = getSupabaseClient();

      expect(client1).toBe(client2);
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it('should create new client after reset', () => {
      getSupabaseClient();
      resetSupabaseClient();
      getSupabaseClient();

      expect(createClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('createRequestScopedClient', () => {
    it('should create client with request correlation ID', () => {
      const mockReq = {
        correlationId: 'request-correlation-id'
      };

      createRequestScopedClient(mockReq);

      expect(createClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          global: expect.objectContaining({
            headers: expect.objectContaining({
              'X-Correlation-ID': 'request-correlation-id'
            })
          })
        })
      );
    });

    it('should merge additional options', () => {
      const mockReq = { correlationId: 'test-id' };

      createRequestScopedClient(mockReq, { serviceName: 'custom-service' });

      expect(createClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          global: expect.objectContaining({
            headers: expect.objectContaining({
              'X-Client-Info': 'enfinia-shared/custom-service'
            })
          })
        })
      );
    });
  });

  describe('supabaseMiddleware', () => {
    it('should attach supabase client to request', () => {
      const middleware = supabaseMiddleware({ serviceName: 'test-service' });
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.supabase).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use shared client by default', () => {
      const middleware = supabaseMiddleware({ serviceName: 'test-service' });
      const mockReq1 = {};
      const mockReq2 = {};
      const mockRes = {};
      const mockNext = jest.fn();

      middleware(mockReq1, mockRes, mockNext);
      middleware(mockReq2, mockRes, mockNext);

      expect(mockReq1.supabase).toBe(mockReq2.supabase);
    });

    it('should create per-request client when perRequest is true', () => {
      const middleware = supabaseMiddleware({
        serviceName: 'test-service',
        perRequest: true
      });

      const mockReq1 = { correlationId: 'req-1' };
      const mockReq2 = { correlationId: 'req-2' };
      const mockRes = {};
      const mockNext = jest.fn();

      middleware(mockReq1, mockRes, mockNext);
      middleware(mockReq2, mockRes, mockNext);

      // Each request gets its own client
      expect(createClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy when connection works', async () => {
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      };

      const result = await checkDatabaseHealth(mockClient);

      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeDefined();
    });

    it('should return healthy when table not found (PGRST116)', async () => {
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          error: { code: 'PGRST116', message: 'Table not found' }
        })
      };

      const result = await checkDatabaseHealth(mockClient);

      expect(result.healthy).toBe(true);
    });

    it('should return unhealthy on connection error', async () => {
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          error: { code: 'CONNECTION_ERROR', message: 'Connection failed' }
        })
      };

      const result = await checkDatabaseHealth(mockClient);

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should handle thrown errors', async () => {
      const mockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      const result = await checkDatabaseHealth(mockClient);

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});
