const {
  generateUUID,
  isValidUUID,
  parseUUID,
  ensureUUID,
  extractUUID,
  uuidEquals,
  UUID_PATTERN
} = require('../../src/infrastructure/database/uuid-generator');

describe('uuid-generator', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(UUID_PATTERN);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 1000; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(1000);
    });

    it('should generate lowercase UUIDs', () => {
      const uuid = generateUUID();
      expect(uuid).toBe(uuid.toLowerCase());
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID v4', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-51d4-a716-446655440000')).toBe(false); // Version 5
      expect(isValidUUID('550e8400-e29b-41d4-c716-446655440000')).toBe(false); // Invalid variant
      expect(isValidUUID('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID(undefined)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      expect(isValidUUID('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
    });
  });

  describe('parseUUID', () => {
    it('should return lowercase UUID for valid UUID', () => {
      expect(parseUUID('550E8400-E29B-41D4-A716-446655440000'))
        .toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return null for invalid UUID', () => {
      expect(parseUUID('invalid')).toBeNull();
      expect(parseUUID(null)).toBeNull();
    });
  });

  describe('ensureUUID', () => {
    it('should return existing UUID if valid', () => {
      const existing = '550e8400-e29b-41d4-a716-446655440000';
      expect(ensureUUID(existing)).toBe(existing);
    });

    it('should generate new UUID if invalid', () => {
      const result = ensureUUID('invalid');
      expect(isValidUUID(result)).toBe(true);
    });

    it('should generate new UUID if null', () => {
      const result = ensureUUID(null);
      expect(isValidUUID(result)).toBe(true);
    });

    it('should generate new UUID if undefined', () => {
      const result = ensureUUID(undefined);
      expect(isValidUUID(result)).toBe(true);
    });
  });

  describe('extractUUID', () => {
    it('should return formatted UUID from valid UUID string', () => {
      expect(extractUUID('550e8400-e29b-41d4-a716-446655440000'))
        .toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should format UUID from hex string without dashes', () => {
      expect(extractUUID('550e8400e29b41d4a716446655440000'))
        .toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return null for invalid input', () => {
      expect(extractUUID('invalid')).toBeNull();
      expect(extractUUID(null)).toBeNull();
      expect(extractUUID('')).toBeNull();
    });
  });

  describe('uuidEquals', () => {
    it('should return true for equal UUIDs', () => {
      expect(uuidEquals(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440000'
      )).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(uuidEquals(
        '550E8400-E29B-41D4-A716-446655440000',
        '550e8400-e29b-41d4-a716-446655440000'
      )).toBe(true);
    });

    it('should return false for different UUIDs', () => {
      expect(uuidEquals(
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8'
      )).toBe(false);
    });

    it('should return false if either UUID is invalid', () => {
      expect(uuidEquals('550e8400-e29b-41d4-a716-446655440000', 'invalid')).toBe(false);
      expect(uuidEquals('invalid', '550e8400-e29b-41d4-a716-446655440000')).toBe(false);
      expect(uuidEquals(null, '550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });
  });

  describe('UUID_PATTERN', () => {
    it('should match valid UUID v4 format', () => {
      expect(UUID_PATTERN.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(UUID_PATTERN.test('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
      expect(UUID_PATTERN.test('00000000-0000-4000-8000-000000000000')).toBe(true);
    });

    it('should not match invalid format', () => {
      expect(UUID_PATTERN.test('invalid')).toBe(false);
      expect(UUID_PATTERN.test('00000000-0000-0000-0000-000000000000')).toBe(false); // Not v4
    });
  });
});
