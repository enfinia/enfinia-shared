const {
  createHttpClient,
  httpClientMiddleware
} = require('../../src/infrastructure/http/http-client');

// Mock global fetch
global.fetch = jest.fn();

describe('HTTP Client', () => {
  beforeEach(() => {
    global.fetch.mockClear();
  });

  describe('createHttpClient', () => {
    it('should create client with default options', () => {
      const client = createHttpClient();
      expect(client.fetch).toBeDefined();
      expect(client.get).toBeDefined();
      expect(client.post).toBeDefined();
      expect(client.put).toBeDefined();
      expect(client.patch).toBeDefined();
      expect(client.delete).toBeDefined();
    });

    it('should include correlation ID in headers', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: 'test' })
      });

      const client = createHttpClient({
        correlationId: 'test-correlation-id',
        serviceName: 'test-service'
      });

      await client.get('https://api.example.com/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-correlation-id': 'test-correlation-id',
            'X-Service-Name': 'test-service'
          })
        })
      );
    });

    it('should use base URL for relative paths', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      });

      const client = createHttpClient({
        baseUrl: 'https://api.example.com'
      });

      await client.get('/users');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.any(Object)
      );
    });

    it('should not prepend base URL for absolute URLs', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      });

      const client = createHttpClient({
        baseUrl: 'https://api.example.com'
      });

      await client.get('https://other.example.com/data');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://other.example.com/data',
        expect.any(Object)
      );
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ success: true })
      });
    });

    it('should make GET request', async () => {
      const client = createHttpClient();
      await client.get('https://api.example.com/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request with JSON body', async () => {
      const client = createHttpClient();
      await client.post('https://api.example.com/test', { name: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' })
        })
      );
    });

    it('should make PUT request', async () => {
      const client = createHttpClient();
      await client.put('https://api.example.com/test', { id: 1 });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should make PATCH request', async () => {
      const client = createHttpClient();
      await client.patch('https://api.example.com/test', { status: 'active' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should make DELETE request', async () => {
      const client = createHttpClient();
      await client.delete('https://api.example.com/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('error handling', () => {
    it('should throw error for non-ok responses', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found')
      });

      const client = createHttpClient();

      await expect(client.get('https://api.example.com/missing'))
        .rejects.toThrow('HTTP 404: Not found');
    });

    it('should include status code in error', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error')
      });

      const client = createHttpClient();

      try {
        await client.get('https://api.example.com/error');
        fail('Should have thrown');
      } catch (error) {
        expect(error.status).toBe(500);
      }
    });
  });

  describe('response handling', () => {
    it('should return JSON for json content-type', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json; charset=utf-8' },
        json: () => Promise.resolve({ data: 'test' })
      });

      const client = createHttpClient();
      const result = await client.get('https://api.example.com/json');

      expect(result).toEqual({ data: 'test' });
    });

    it('should return text for non-json content-type', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/plain' },
        text: () => Promise.resolve('plain text response')
      });

      const client = createHttpClient();
      const result = await client.get('https://api.example.com/text');

      expect(result).toBe('plain text response');
    });
  });

  describe('withHeaders', () => {
    it('should create new client with additional headers', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      });

      const client = createHttpClient({ correlationId: 'original' });
      const newClient = client.withHeaders({ 'X-Custom': 'value' });

      await newClient.get('https://api.example.com/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-correlation-id': 'original'
          })
        })
      );
    });
  });

  describe('httpClientMiddleware', () => {
    it('should attach HTTP client to request', () => {
      const middleware = httpClientMiddleware({ serviceName: 'test-service' });

      const mockReq = { correlationId: 'req-id' };
      const mockRes = {};
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.httpClient).toBeDefined();
      expect(mockReq.httpClient.get).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use request correlation ID', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      });

      const middleware = httpClientMiddleware({ serviceName: 'my-service' });

      const mockReq = { correlationId: 'request-correlation-id' };
      const mockRes = {};
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      await mockReq.httpClient.get('https://api.example.com/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-correlation-id': 'request-correlation-id',
            'X-Service-Name': 'my-service'
          })
        })
      );
    });
  });
});
