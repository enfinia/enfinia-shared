const CryptoService = require('../../src/crypto-service');

describe('CryptoService - Extended Methods', () => {
  let crypto;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-at-least-32-chars-long';
  });

  beforeEach(() => {
    crypto = new CryptoService();
  });

  describe('FIELD_TYPES', () => {
    it('should have all expected field types', () => {
      expect(CryptoService.FIELD_TYPES.PHONE).toBe('phone');
      expect(CryptoService.FIELD_TYPES.VALUE).toBe('value');
      expect(CryptoService.FIELD_TYPES.TEXT).toBe('text');
      expect(CryptoService.FIELD_TYPES.JSON).toBe('json');
      expect(CryptoService.FIELD_TYPES.NUMBER).toBe('number');
    });
  });

  describe('SENSITIVE_FIELDS', () => {
    it('should have fields defined for main tables', () => {
      expect(CryptoService.SENSITIVE_FIELDS.users).toContain('contact');
      expect(CryptoService.SENSITIVE_FIELDS.transactions).toContain('value');
      expect(CryptoService.SENSITIVE_FIELDS.transactions).toContain('description');
    });
  });

  describe('encryptField', () => {
    it('should encrypt text field', () => {
      const encrypted = crypto.encryptField('test text', 'text');
      expect(encrypted).not.toBe('test text');
      expect(encrypted).toContain(':');
    });

    it('should encrypt phone field', () => {
      const encrypted = crypto.encryptField('11999999999', 'phone');
      expect(encrypted).not.toBe('11999999999');
    });

    it('should encrypt number/value field', () => {
      const encrypted = crypto.encryptField(1500.50, 'value');
      expect(encrypted).not.toBe('1500.50');
    });

    it('should encrypt JSON field', () => {
      const data = { key: 'value' };
      const encrypted = crypto.encryptField(data, 'json');
      expect(encrypted).not.toBe(JSON.stringify(data));
    });

    it('should return null for null/undefined', () => {
      expect(crypto.encryptField(null)).toBeNull();
      expect(crypto.encryptField(undefined)).toBeNull();
    });
  });

  describe('decryptField', () => {
    it('should decrypt text field', () => {
      const encrypted = crypto.encryptField('test text', 'text');
      const decrypted = crypto.decryptField(encrypted, 'text');
      expect(decrypted).toBe('test text');
    });

    it('should decrypt number/value field', () => {
      const encrypted = crypto.encryptField(1500.50, 'value');
      const decrypted = crypto.decryptField(encrypted, 'value');
      expect(decrypted).toBe(1500.50);
    });

    it('should decrypt JSON field', () => {
      const data = { key: 'value', num: 123 };
      const encrypted = crypto.encryptField(data, 'json');
      const decrypted = crypto.decryptField(encrypted, 'json');
      expect(decrypted).toEqual(data);
    });

    it('should return null for null/empty', () => {
      expect(crypto.decryptField(null)).toBeNull();
      expect(crypto.decryptField('')).toBeNull();
    });
  });

  describe('encryptObject', () => {
    it('should encrypt specified fields with array', () => {
      const obj = { name: 'John', phone: '11999999999', email: 'john@test.com' };
      const result = crypto.encryptObject(obj, ['phone']);

      expect(result.name).toBe('John');
      expect(result.email).toBe('john@test.com');
      expect(result.phone).not.toBe('11999999999');
      expect(result.phone).toContain(':');
    });

    it('should encrypt fields with type specification', () => {
      const obj = { name: 'John', phone: '11999999999', amount: 1500 };
      const result = crypto.encryptObject(obj, {
        phone: 'phone',
        amount: 'value'
      });

      expect(result.name).toBe('John');
      expect(result.phone).not.toBe('11999999999');
      expect(result.amount).not.toBe('1500');
    });

    it('should skip null/undefined fields', () => {
      const obj = { name: 'John', phone: null };
      const result = crypto.encryptObject(obj, ['phone']);

      expect(result.phone).toBeNull();
    });

    it('should return input if not an object', () => {
      expect(crypto.encryptObject(null, ['field'])).toBeNull();
      expect(crypto.encryptObject('string', ['field'])).toBe('string');
    });
  });

  describe('decryptObject', () => {
    it('should decrypt specified fields with array', () => {
      const original = { name: 'John', phone: '11999999999' };
      const encrypted = crypto.encryptObject(original, ['phone']);
      const decrypted = crypto.decryptObject(encrypted, ['phone']);

      expect(decrypted.name).toBe('John');
      expect(decrypted.phone).toBe('11999999999');
    });

    it('should decrypt fields with type specification', () => {
      const original = { name: 'John', phone: '11999999999', amount: 1500.50 };
      const encrypted = crypto.encryptObject(original, {
        phone: 'phone',
        amount: 'value'
      });
      const decrypted = crypto.decryptObject(encrypted, {
        phone: 'phone',
        amount: 'value'
      });

      expect(decrypted.name).toBe('John');
      expect(decrypted.phone).toBe('11999999999');
      expect(decrypted.amount).toBe(1500.50);
    });
  });

  describe('encryptForTable', () => {
    it('should encrypt fields based on table config', () => {
      const user = { name: 'John', contact: '11999999999', status: 'active' };
      const result = crypto.encryptForTable('users', user);

      expect(result.name).toBe('John');
      expect(result.status).toBe('active');
      expect(result.contact).not.toBe('11999999999');
    });

    it('should return unchanged for unknown table', () => {
      const data = { field: 'value' };
      const result = crypto.encryptForTable('unknown_table', data);

      expect(result).toEqual(data);
    });
  });

  describe('decryptFromTable', () => {
    it('should decrypt fields based on table config', () => {
      const user = { name: 'John', contact: '11999999999', status: 'active' };
      const encrypted = crypto.encryptForTable('users', user);
      const decrypted = crypto.decryptFromTable('users', encrypted);

      expect(decrypted.name).toBe('John');
      expect(decrypted.status).toBe('active');
      expect(decrypted.contact).toBe('11999999999');
    });
  });

  describe('encryptArrayForTable', () => {
    it('should encrypt array of objects', () => {
      const users = [
        { name: 'John', contact: '11111111111' },
        { name: 'Jane', contact: '22222222222' }
      ];
      const result = crypto.encryptArrayForTable('users', users);

      expect(result).toHaveLength(2);
      expect(result[0].contact).not.toBe('11111111111');
      expect(result[1].contact).not.toBe('22222222222');
    });

    it('should return input if not array', () => {
      expect(crypto.encryptArrayForTable('users', 'not array')).toBe('not array');
    });
  });

  describe('decryptArrayFromTable', () => {
    it('should decrypt array of objects', () => {
      const users = [
        { name: 'John', contact: '11111111111' },
        { name: 'Jane', contact: '22222222222' }
      ];
      const encrypted = crypto.encryptArrayForTable('users', users);
      const decrypted = crypto.decryptArrayFromTable('users', encrypted);

      expect(decrypted[0].contact).toBe('11111111111');
      expect(decrypted[1].contact).toBe('22222222222');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const encrypted = crypto.criptografar('test');
      expect(crypto.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for non-encrypted values', () => {
      expect(crypto.isEncrypted('plain text')).toBe(false);
      expect(crypto.isEncrypted('11999999999')).toBe(false);
      expect(crypto.isEncrypted('invalid:format')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(crypto.isEncrypted(null)).toBe(false);
      expect(crypto.isEncrypted(undefined)).toBe(false);
    });
  });

  describe('getSensitiveFields', () => {
    it('should return fields for known table', () => {
      const fields = CryptoService.getSensitiveFields('users');
      expect(fields).toContain('contact');
    });

    it('should return empty array for unknown table', () => {
      const fields = CryptoService.getSensitiveFields('unknown');
      expect(fields).toEqual([]);
    });
  });

  describe('registerSensitiveFields', () => {
    it('should register new fields for a table', () => {
      CryptoService.registerSensitiveFields('custom_table', ['field1', 'field2']);
      const fields = CryptoService.getSensitiveFields('custom_table');

      expect(fields).toContain('field1');
      expect(fields).toContain('field2');
    });
  });
});
