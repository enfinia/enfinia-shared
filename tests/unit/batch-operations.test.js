const {
  batchInsert,
  batchUpdate,
  batchUpsert,
  batchDelete,
  withRetry,
  chunk,
  sleep,
  calculateDelay,
  DEFAULT_BATCH_SIZE,
  DEFAULT_RETRY_CONFIG
} = require('../../src/infrastructure/database/batch-operations');

describe('batch-operations', () => {
  describe('chunk', () => {
    it('should split array into chunks of specified size', () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      const result = chunk(array, 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([1, 2, 3]);
      expect(result[1]).toEqual([4, 5, 6]);
      expect(result[2]).toEqual([7]);
    });

    it('should return single chunk for small arrays', () => {
      const array = [1, 2];
      const result = chunk(array, 5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual([1, 2]);
    });

    it('should handle empty array', () => {
      expect(chunk([], 5)).toEqual([]);
    });
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      const config = { initialDelayMs: 100, backoffMultiplier: 2, maxDelayMs: 5000 };

      expect(calculateDelay(0, config)).toBe(100);
      expect(calculateDelay(1, config)).toBe(200);
      expect(calculateDelay(2, config)).toBe(400);
      expect(calculateDelay(3, config)).toBe(800);
    });

    it('should cap at maxDelayMs', () => {
      const config = { initialDelayMs: 100, backoffMultiplier: 2, maxDelayMs: 300 };

      expect(calculateDelay(5, config)).toBe(300);
    });
  });

  describe('withRetry', () => {
    it('should return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 1,
        maxDelayMs: 10
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const error = new Error('persistent failure');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withRetry(operation, {
        maxRetries: 2,
        initialDelayMs: 1,
        maxDelayMs: 10
      })).rejects.toThrow('persistent failure');

      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('batchInsert', () => {
    let mockSupabase;

    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: [], error: null })
      };
    });

    it('should return early for empty records', async () => {
      const result = await batchInsert(mockSupabase, 'test', []);

      expect(result.success).toBe(true);
      expect(result.inserted).toBe(0);
      expect(result.batches).toBe(0);
    });

    it('should insert records in batches', async () => {
      const records = Array.from({ length: 250 }, (_, i) => ({ id: i }));

      mockSupabase.from = jest.fn().mockReturnThis();
      mockSupabase.insert = jest.fn().mockReturnThis();
      mockSupabase.select = jest.fn().mockResolvedValue({ data: [], error: null });

      const result = await batchInsert(mockSupabase, 'test', records, {
        batchSize: 100
      });

      expect(result.batches).toBe(3); // 250 / 100 = 3 batches
      expect(result.inserted).toBe(250);
    });

    it('should add timestamps by default', async () => {
      const records = [{ name: 'test' }];
      let insertedData;

      mockSupabase.insert = jest.fn((data) => {
        insertedData = data;
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      await batchInsert(mockSupabase, 'test', records);

      expect(insertedData[0].created_at).toBeDefined();
      expect(insertedData[0].updated_at).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const records = [{ name: 'test' }];

      // Mock the chain to return error - without returnData the insert is awaited directly
      mockSupabase.from = jest.fn().mockReturnThis();
      mockSupabase.insert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await batchInsert(mockSupabase, 'test', records, {
        retry: { maxRetries: 0, initialDelayMs: 1, maxDelayMs: 10 }
      });

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });
  });

  describe('batchUpdate', () => {
    let mockSupabase;

    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };
    });

    it('should return early for empty updates', async () => {
      const result = await batchUpdate(mockSupabase, 'test', []);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(0);
    });

    it('should update records', async () => {
      const updates = [
        { id: 1, data: { name: 'a' } },
        { id: 2, data: { name: 'b' } }
      ];

      const result = await batchUpdate(mockSupabase, 'test', updates);

      expect(result.updated).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should skip updates without id or data', async () => {
      const updates = [
        { id: 1, data: { name: 'a' } },
        { data: { name: 'b' } }, // missing id
        { id: 3 } // missing data
      ];

      const result = await batchUpdate(mockSupabase, 'test', updates);

      expect(result.updated).toBe(1);
      expect(result.failed).toBe(2);
    });
  });

  describe('batchUpsert', () => {
    let mockSupabase;

    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: [], error: null })
      };
    });

    it('should return early for empty records', async () => {
      const result = await batchUpsert(mockSupabase, 'test', []);

      expect(result.success).toBe(true);
      expect(result.upserted).toBe(0);
    });

    it('should upsert records with onConflict', async () => {
      const records = [{ uuid: 'abc', name: 'test' }];
      let upsertOptions;

      mockSupabase.upsert = jest.fn((data, options) => {
        upsertOptions = options;
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      await batchUpsert(mockSupabase, 'test', records, {
        onConflict: 'uuid'
      });

      expect(upsertOptions.onConflict).toBe('uuid');
    });
  });

  describe('batchDelete', () => {
    let mockSupabase;

    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ error: null })
      };
    });

    it('should return early for empty ids', async () => {
      const result = await batchDelete(mockSupabase, 'test', []);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
    });

    it('should delete records in batches', async () => {
      const ids = [1, 2, 3, 4, 5];

      const result = await batchDelete(mockSupabase, 'test', ids, {
        batchSize: 2
      });

      expect(result.batches).toBe(3); // 5 / 2 = 3 batches
      expect(result.deleted).toBe(5);
    });
  });

  describe('DEFAULT_BATCH_SIZE', () => {
    it('should be 100', () => {
      expect(DEFAULT_BATCH_SIZE).toBe(100);
    });
  });

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have expected values', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(100);
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(5000);
      expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
    });
  });
});
