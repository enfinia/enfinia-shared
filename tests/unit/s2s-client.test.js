/**
 * Tests for S2S Authentication Client and Token Generator
 */
const { S2SClient, S2STokenGenerator } = require('../../src/adapters/auth/s2s-client');

describe('S2STokenGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new S2STokenGenerator('test-jwt-secret-key-for-testing');
  });

  describe('constructor', () => {
    it('should throw error if no JWT secret provided', () => {
      const originalEnv = process.env.S2S_JWT_SECRET;
      delete process.env.S2S_JWT_SECRET;

      expect(() => new S2STokenGenerator()).toThrow('S2S_JWT_SECRET is required');

      process.env.S2S_JWT_SECRET = originalEnv;
    });

    it('should use environment variable if no secret provided', () => {
      const originalEnv = process.env.S2S_JWT_SECRET;
      process.env.S2S_JWT_SECRET = 'env-secret-key';

      const gen = new S2STokenGenerator();
      expect(gen).toBeDefined();

      process.env.S2S_JWT_SECRET = originalEnv;
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const result = generator.generateTokens('test-service');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.expiresIn).toBe(15 * 60); // 15 minutes
    });

    it('should generate different tokens for different services', () => {
      const result1 = generator.generateTokens('service-a');
      const result2 = generator.generateTokens('service-b');

      expect(result1.accessToken).not.toBe(result2.accessToken);
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid access token', () => {
      const { accessToken } = generator.generateTokens('test-service');

      const result = generator.verifyToken(accessToken);

      expect(result.valid).toBe(true);
      expect(result.payload.type).toBe('access');
      expect(result.payload.service).toBe('test-service');
    });

    it('should verify valid refresh token', () => {
      const { refreshToken } = generator.generateTokens('test-service');

      const result = generator.verifyToken(refreshToken);

      expect(result.valid).toBe(true);
      expect(result.payload.type).toBe('refresh');
      expect(result.payload.service).toBe('test-service');
    });

    it('should reject invalid token', () => {
      const result = generator.verifyToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should reject token signed with different secret', () => {
      const otherGenerator = new S2STokenGenerator('different-secret-key');
      const { accessToken } = otherGenerator.generateTokens('test-service');

      const result = generator.verifyToken(accessToken);

      expect(result.valid).toBe(false);
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from valid refresh token', () => {
      const { refreshToken } = generator.generateTokens('test-service');

      const result = generator.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.error).toBeUndefined();
    });

    it('should reject access token as refresh token', () => {
      const { accessToken } = generator.generateTokens('test-service');

      const result = generator.refreshAccessToken(accessToken);

      expect(result.error).toBe('Invalid token type');
    });

    it('should reject invalid refresh token', () => {
      const result = generator.refreshAccessToken('invalid-token');

      expect(result.error).toBe('Invalid token');
    });
  });
});

describe('S2SClient', () => {
  let mockHttpClient;

  beforeEach(() => {
    mockHttpClient = jest.fn();
  });

  describe('constructor', () => {
    it('should throw error if no API key provided', () => {
      expect(() => new S2SClient({
        serviceName: 'test',
        httpClient: mockHttpClient
      })).toThrow('SERVICE_API_KEY is required');
    });

    it('should throw error if no service name provided', () => {
      expect(() => new S2SClient({
        serviceApiKey: 'key',
        httpClient: mockHttpClient
      })).toThrow('SERVICE_NAME is required');
    });

    it('should create client with valid options', () => {
      const client = new S2SClient({
        serviceApiKey: 'test-key',
        serviceName: 'test-service',
        authEndpoint: 'http://localhost:3001',
        httpClient: mockHttpClient
      });

      expect(client).toBeDefined();
      expect(client.serviceName).toBe('test-service');
    });
  });

  describe('authenticate', () => {
    it('should call auth endpoint with API key', async () => {
      mockHttpClient.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 900
        })
      });

      const client = new S2SClient({
        serviceApiKey: 'test-key',
        serviceName: 'test-service',
        authEndpoint: 'http://localhost:3001',
        httpClient: mockHttpClient
      });

      const result = await client.authenticate();

      expect(mockHttpClient).toHaveBeenCalledWith(
        'http://localhost:3001/auth/s2s/token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            apiKey: 'test-key',
            serviceName: 'test-service'
          })
        })
      );
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw error on auth failure', async () => {
      mockHttpClient.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Invalid API key')
      });

      const client = new S2SClient({
        serviceApiKey: 'bad-key',
        serviceName: 'test-service',
        authEndpoint: 'http://localhost:3001',
        httpClient: mockHttpClient
      });

      await expect(client.authenticate()).rejects.toThrow('S2S authentication failed');
    });
  });

  describe('request', () => {
    it('should add Authorization header to requests', async () => {
      mockHttpClient
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            accessToken: 'test-token',
            refreshToken: 'refresh-token',
            expiresIn: 900
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'test' })
        });

      const client = new S2SClient({
        serviceApiKey: 'test-key',
        serviceName: 'test-service',
        authEndpoint: 'http://localhost:3001',
        httpClient: mockHttpClient
      });

      await client.request('http://other-service/api/data');

      expect(mockHttpClient).toHaveBeenLastCalledWith(
        'http://other-service/api/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'X-Service-Name': 'test-service'
          })
        })
      );
    });
  });

  describe('clearTokens', () => {
    it('should clear all stored tokens', async () => {
      mockHttpClient.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'test-token',
          refreshToken: 'refresh-token',
          expiresIn: 900
        })
      });

      const client = new S2SClient({
        serviceApiKey: 'test-key',
        serviceName: 'test-service',
        authEndpoint: 'http://localhost:3001',
        httpClient: mockHttpClient
      });

      await client.authenticate();
      expect(client.accessToken).toBe('test-token');

      client.clearTokens();

      expect(client.accessToken).toBeNull();
      expect(client.refreshToken).toBeNull();
      expect(client.accessTokenExpiry).toBeNull();
    });
  });
});
