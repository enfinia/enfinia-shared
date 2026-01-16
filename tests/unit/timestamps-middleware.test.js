const {
  getCurrentTimestamp,
  addCreatedAt,
  addUpdatedAt,
  addTimestamps,
  processRecords,
  createTimestampConfig,
  parseTimestamp,
  formatTimestamp,
  isWithinRange,
  daysAgo,
  hoursAgo
} = require('../../src/infrastructure/database/timestamps-middleware');

describe('timestamps-middleware', () => {
  describe('getCurrentTimestamp', () => {
    it('should return ISO format timestamp', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return current time', () => {
      const before = Date.now();
      const timestamp = getCurrentTimestamp();
      const after = Date.now();

      const time = new Date(timestamp).getTime();
      expect(time).toBeGreaterThanOrEqual(before);
      expect(time).toBeLessThanOrEqual(after);
    });
  });

  describe('addCreatedAt', () => {
    it('should add created_at to object', () => {
      const data = { name: 'test' };
      const result = addCreatedAt(data);

      expect(result.name).toBe('test');
      expect(result.created_at).toBeDefined();
      expect(new Date(result.created_at)).toBeInstanceOf(Date);
    });

    it('should not overwrite existing created_at by default', () => {
      const existing = '2020-01-01T00:00:00.000Z';
      const data = { name: 'test', created_at: existing };
      const result = addCreatedAt(data);

      expect(result.created_at).toBe(existing);
    });

    it('should overwrite created_at when overwrite=true', () => {
      const existing = '2020-01-01T00:00:00.000Z';
      const data = { name: 'test', created_at: existing };
      const result = addCreatedAt(data, true);

      expect(result.created_at).not.toBe(existing);
    });

    it('should return input if not an object', () => {
      expect(addCreatedAt(null)).toBeNull();
      expect(addCreatedAt(undefined)).toBeUndefined();
      expect(addCreatedAt('string')).toBe('string');
    });
  });

  describe('addUpdatedAt', () => {
    it('should add updated_at to object', () => {
      const data = { name: 'test' };
      const result = addUpdatedAt(data);

      expect(result.name).toBe('test');
      expect(result.updated_at).toBeDefined();
    });

    it('should overwrite existing updated_at', () => {
      const existing = '2020-01-01T00:00:00.000Z';
      const data = { name: 'test', updated_at: existing };
      const result = addUpdatedAt(data);

      expect(result.updated_at).not.toBe(existing);
    });

    it('should return input if not an object', () => {
      expect(addUpdatedAt(null)).toBeNull();
    });
  });

  describe('addTimestamps', () => {
    it('should add both created_at and updated_at', () => {
      const data = { name: 'test' };
      const result = addTimestamps(data);

      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should not overwrite existing created_at', () => {
      const existing = '2020-01-01T00:00:00.000Z';
      const data = { name: 'test', created_at: existing };
      const result = addTimestamps(data);

      expect(result.created_at).toBe(existing);
      expect(result.updated_at).toBeDefined();
    });
  });

  describe('processRecords', () => {
    it('should process array of records for create', () => {
      const records = [{ name: 'a' }, { name: 'b' }];
      const result = processRecords(records, 'create');

      expect(result).toHaveLength(2);
      expect(result[0].created_at).toBeDefined();
      expect(result[1].created_at).toBeDefined();
    });

    it('should process array of records for update', () => {
      const records = [{ name: 'a' }, { name: 'b' }];
      const result = processRecords(records, 'update');

      expect(result).toHaveLength(2);
      expect(result[0].updated_at).toBeDefined();
      expect(result[1].updated_at).toBeDefined();
      expect(result[0].created_at).toBeUndefined();
    });

    it('should return input if not an array', () => {
      expect(processRecords('not array')).toBe('not array');
    });
  });

  describe('createTimestampConfig', () => {
    it('should return config object', () => {
      const config = createTimestampConfig();

      expect(config.onInsert).toBeInstanceOf(Function);
      expect(config.onUpdate).toBeInstanceOf(Function);
      expect(config.getCurrentTimestamp).toBeInstanceOf(Function);
      expect(config.timezone).toBe('UTC');
    });
  });

  describe('parseTimestamp', () => {
    it('should parse ISO string to Date', () => {
      const result = parseTimestamp('2026-01-15T10:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should return Date object as-is', () => {
      const date = new Date();
      expect(parseTimestamp(date)).toBe(date);
    });

    it('should return null for invalid input', () => {
      expect(parseTimestamp(null)).toBeNull();
      expect(parseTimestamp('invalid')).toBeNull();
    });
  });

  describe('formatTimestamp', () => {
    it('should format Date to ISO string', () => {
      const date = new Date('2026-01-15T10:30:00.000Z');
      expect(formatTimestamp(date)).toBe('2026-01-15T10:30:00.000Z');
    });

    it('should format string to ISO string', () => {
      const result = formatTimestamp('2026-01-15T10:30:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return null for invalid input', () => {
      expect(formatTimestamp(null)).toBeNull();
    });
  });

  describe('isWithinRange', () => {
    it('should return true if timestamp is within range', () => {
      const timestamp = '2026-01-15T10:30:00.000Z';
      const start = '2026-01-01T00:00:00.000Z';
      const end = '2026-12-31T23:59:59.999Z';

      expect(isWithinRange(timestamp, start, end)).toBe(true);
    });

    it('should return false if timestamp is outside range', () => {
      const timestamp = '2027-01-01T00:00:00.000Z';
      const start = '2026-01-01T00:00:00.000Z';
      const end = '2026-12-31T23:59:59.999Z';

      expect(isWithinRange(timestamp, start, end)).toBe(false);
    });

    it('should return false for invalid timestamps', () => {
      expect(isWithinRange(null, '2026-01-01', '2026-12-31')).toBe(false);
      expect(isWithinRange('2026-06-15', null, '2026-12-31')).toBe(false);
    });
  });

  describe('daysAgo', () => {
    it('should return timestamp from N days ago', () => {
      const result = daysAgo(7);
      const date = new Date(result);
      const now = new Date();
      const diff = Math.round((now - date) / (1000 * 60 * 60 * 24));

      expect(diff).toBe(7);
    });
  });

  describe('hoursAgo', () => {
    it('should return timestamp from N hours ago', () => {
      const result = hoursAgo(3);
      const date = new Date(result);
      const now = new Date();
      const diff = Math.round((now - date) / (1000 * 60 * 60));

      expect(diff).toBe(3);
    });
  });
});
