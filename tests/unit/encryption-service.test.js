/**
 * Tests for Encryption Service
 */
const {
  createEncryptionService,
  hash,
  generateToken,
  generateUUID,
  maskText,
  maskPhone,
  maskEmail,
  maskCurrency
} = require('../../src/infrastructure/crypto/encryption-service');

describe('Encryption Service', () => {
  const TEST_KEY = 'test-encryption-key-at-least-32-chars';
  let service;

  beforeEach(() => {
    service = createEncryptionService({ encryptionKey: TEST_KEY });
  });

  describe('createEncryptionService', () => {
    it('should create service with valid key', () => {
      expect(service).toBeDefined();
      expect(service.encrypt).toBeDefined();
      expect(service.decrypt).toBeDefined();
    });

    it('should throw error if no key provided', () => {
      const originalEnv = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => createEncryptionService()).toThrow('Encryption key is required');

      process.env.ENCRYPTION_KEY = originalEnv;
    });

    it('should throw error if key is too short', () => {
      expect(() => createEncryptionService({ encryptionKey: 'short' }))
        .toThrow('at least 32 characters');
    });

    it('should use environment variable if no option provided', () => {
      const originalEnv = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'environment-key-at-least-32-characters';

      const envService = createEncryptionService();
      expect(envService).toBeDefined();

      process.env.ENCRYPTION_KEY = originalEnv;
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should return null for null/undefined/empty input', () => {
      expect(service.encrypt(null)).toBeNull();
      expect(service.encrypt(undefined)).toBeNull();
      expect(service.encrypt('')).toBeNull();
    });

    it('should return null when decrypting invalid input', () => {
      expect(service.decrypt(null)).toBeNull();
      expect(service.decrypt(undefined)).toBeNull();
      expect(service.decrypt('')).toBeNull();
      expect(service.decrypt('invalid')).toBeNull();
      expect(service.decrypt(123)).toBeNull();
    });

    it('should produce different encrypted values for same input', () => {
      const plaintext = 'Same text';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'Olá, mundo! 你好 🎉 <script>';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should convert non-string values to string', () => {
      const encrypted = service.encrypt(12345);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe('12345');
    });
  });

  describe('encryptJSON/decryptJSON', () => {
    it('should encrypt and decrypt objects', () => {
      const obj = { name: 'John', age: 30, nested: { value: true } };
      const encrypted = service.encryptJSON(obj);
      const decrypted = service.decryptJSON(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should return null for null/undefined input', () => {
      expect(service.encryptJSON(null)).toBeNull();
      expect(service.encryptJSON(undefined)).toBeNull();
    });

    it('should return null for invalid encrypted JSON', () => {
      expect(service.decryptJSON(null)).toBeNull();
      expect(service.decryptJSON('')).toBeNull();
    });

    it('should handle arrays', () => {
      const arr = [1, 2, { nested: 'value' }];
      const encrypted = service.encryptJSON(arr);
      const decrypted = service.decryptJSON(encrypted);

      expect(decrypted).toEqual(arr);
    });
  });

  describe('encryptNumber/decryptNumber', () => {
    it('should encrypt and decrypt integers', () => {
      const num = 42;
      const encrypted = service.encryptNumber(num);
      const decrypted = service.decryptNumber(encrypted);

      expect(decrypted).toBe(num);
    });

    it('should encrypt and decrypt floats', () => {
      const num = 3.14159;
      const encrypted = service.encryptNumber(num);
      const decrypted = service.decryptNumber(encrypted);

      expect(decrypted).toBeCloseTo(num);
    });

    it('should return null for null/undefined input', () => {
      expect(service.encryptNumber(null)).toBeNull();
      expect(service.encryptNumber(undefined)).toBeNull();
    });

    it('should return null for invalid encrypted number', () => {
      expect(service.decryptNumber(null)).toBeNull();
      expect(service.decryptNumber('')).toBeNull();
    });

    it('should handle zero', () => {
      const encrypted = service.encryptNumber(0);
      const decrypted = service.decryptNumber(encrypted);

      expect(decrypted).toBe(0);
    });

    it('should handle negative numbers', () => {
      const encrypted = service.encryptNumber(-123.45);
      const decrypted = service.decryptNumber(encrypted);

      expect(decrypted).toBeCloseTo(-123.45);
    });
  });
});

describe('Hash Function', () => {
  it('should hash a value', () => {
    const result = hash('password');

    expect(result).toBeDefined();
    expect(result.length).toBe(64); // SHA-256 produces 64 hex chars
  });

  it('should produce same hash for same input', () => {
    const hash1 = hash('password');
    const hash2 = hash('password');

    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different input', () => {
    const hash1 = hash('password1');
    const hash2 = hash('password2');

    expect(hash1).not.toBe(hash2);
  });

  it('should support salt', () => {
    const hash1 = hash('password', 'salt1');
    const hash2 = hash('password', 'salt2');

    expect(hash1).not.toBe(hash2);
  });
});

describe('Token Generation', () => {
  it('should generate random token', () => {
    const token = generateToken();

    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it('should generate tokens of specified length', () => {
    const token = generateToken(16);

    expect(token.length).toBe(32); // 16 bytes = 32 hex chars
  });

  it('should generate unique tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();

    expect(token1).not.toBe(token2);
  });
});

describe('UUID Generation', () => {
  it('should generate valid UUID v4', () => {
    const uuid = generateUUID();

    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();

    expect(uuid1).not.toBe(uuid2);
  });
});

describe('Masking Functions', () => {
  describe('maskText', () => {
    it('should mask middle of text', () => {
      const result = maskText('1234567890');

      expect(result).toBe('12******90');
    });

    it('should return **** for short text', () => {
      expect(maskText('abc')).toBe('****');
      expect(maskText('')).toBe('****');
      expect(maskText(null)).toBe('****');
    });

    it('should respect custom show parameters', () => {
      const result = maskText('1234567890', 3, 3);

      expect(result).toBe('123****890');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone number keeping last 4 digits', () => {
      const result = maskPhone('+5511999991234');

      expect(result).toBe('*****-1234');
    });

    it('should return **** for invalid input', () => {
      expect(maskPhone(null)).toBe('****');
      expect(maskPhone('')).toBe('****');
      expect(maskPhone('123')).toBe('****');
    });
  });

  describe('maskEmail', () => {
    it('should mask email keeping first char and domain', () => {
      const result = maskEmail('john@example.com');

      expect(result).toBe('j***@example.com');
    });

    it('should return ****@**** for invalid input', () => {
      expect(maskEmail(null)).toBe('****@****');
      expect(maskEmail('')).toBe('****@****');
      expect(maskEmail('invalid')).toBe('****@****');
    });

    it('should handle single character local part', () => {
      const result = maskEmail('a@example.com');

      expect(result).toBe('****@example.com');
    });
  });

  describe('maskCurrency', () => {
    it('should mask currency value', () => {
      const result = maskCurrency(1234.56);

      expect(result).toBe('R$ ****');
    });

    it('should support custom currency symbol', () => {
      const result = maskCurrency(100, '$');

      expect(result).toBe('$ ****');
    });
  });
});
