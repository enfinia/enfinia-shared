/**
 * Encryption Service
 *
 * Provides AES-256-CBC encryption/decryption for sensitive data.
 * Supports text, JSON, and numeric data types.
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const SALT = 'enfinia-salt'; // Fixed salt for key derivation

/**
 * Create an encryption service instance
 *
 * @param {Object} options
 * @param {string} options.encryptionKey - Encryption key (min 32 characters)
 * @returns {Object} Encryption service with encrypt/decrypt methods
 */
function createEncryptionService(options = {}) {
  const encryptionKey = options.encryptionKey || process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('Encryption key is required. Set ENCRYPTION_KEY environment variable or pass encryptionKey option.');
  }

  if (encryptionKey.length < 32) {
    throw new Error('Encryption key must be at least 32 characters long.');
  }

  // Derive a 32-byte key from the provided key
  const key = crypto.scryptSync(encryptionKey, SALT, 32);

  /**
   * Encrypt a string value
   * @param {string} text - Plain text to encrypt
   * @returns {string|null} Encrypted string in format "iv:encrypted" or null on error
   */
  function encrypt(text) {
    if (text === null || text === undefined || text === '') {
      return null;
    }

    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(String(text), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      return null;
    }
  }

  /**
   * Decrypt an encrypted string
   * @param {string} encryptedText - Encrypted string in format "iv:encrypted"
   * @returns {string|null} Decrypted plain text or null on error
   */
  function decrypt(encryptedText) {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return null;
    }

    try {
      const parts = encryptedText.split(':');

      if (parts.length !== 2) {
        return null;
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      return null;
    }
  }

  /**
   * Encrypt a JSON object
   * @param {Object} obj - Object to encrypt
   * @returns {string|null} Encrypted JSON string or null on error
   */
  function encryptJSON(obj) {
    if (obj === null || obj === undefined) {
      return null;
    }

    try {
      const json = JSON.stringify(obj);
      return encrypt(json);
    } catch (error) {
      return null;
    }
  }

  /**
   * Decrypt an encrypted JSON string back to an object
   * @param {string} encryptedText - Encrypted JSON string
   * @returns {Object|null} Decrypted object or null on error
   */
  function decryptJSON(encryptedText) {
    if (!encryptedText) {
      return null;
    }

    try {
      const json = decrypt(encryptedText);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Encrypt a number
   * @param {number} num - Number to encrypt
   * @returns {string|null} Encrypted number or null
   */
  function encryptNumber(num) {
    if (num === null || num === undefined) {
      return null;
    }

    return encrypt(String(num));
  }

  /**
   * Decrypt an encrypted number
   * @param {string} encryptedText - Encrypted number string
   * @returns {number|null} Decrypted number or null
   */
  function decryptNumber(encryptedText) {
    if (!encryptedText) {
      return null;
    }

    const text = decrypt(encryptedText);
    if (!text) {
      return null;
    }

    const num = parseFloat(text);
    return Number.isNaN(num) ? null : num;
  }

  return {
    encrypt,
    decrypt,
    encryptJSON,
    decryptJSON,
    encryptNumber,
    decryptNumber
  };
}

/**
 * Hash a value using SHA-256
 *
 * @param {string} value - Value to hash
 * @param {string} salt - Optional salt to add
 * @returns {string} Hexadecimal hash string
 */
function hash(value, salt = '') {
  return crypto
    .createHash('sha256')
    .update(value + salt)
    .digest('hex');
}

/**
 * Generate a secure random token
 *
 * @param {number} length - Number of bytes (default: 32)
 * @returns {string} Hexadecimal token string
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a UUID v4
 *
 * @returns {string} UUID v4 string
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Mask a text value for display
 *
 * @param {string} text - Text to mask
 * @param {number} showStart - Characters to show at start (default: 2)
 * @param {number} showEnd - Characters to show at end (default: 2)
 * @returns {string} Masked text
 */
function maskText(text, showStart = 2, showEnd = 2) {
  if (!text || typeof text !== 'string') {
    return '****';
  }

  if (text.length <= 4) {
    return '****';
  }

  const start = text.substring(0, showStart);
  const end = text.substring(text.length - showEnd);
  const middleLength = Math.max(4, text.length - showStart - showEnd);
  const middle = '*'.repeat(middleLength);

  return `${start}${middle}${end}`;
}

/**
 * Mask a phone number for display
 *
 * @param {string} phone - Phone number to mask
 * @returns {string} Masked phone (e.g., "+55 ***** ****-1234")
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '****';
  }

  // Keep last 4 digits visible
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '****';
  }

  const lastFour = digits.slice(-4);
  return `*****-${lastFour}`;
}

/**
 * Mask an email for display
 *
 * @param {string} email - Email to mask
 * @returns {string} Masked email (e.g., "j***@example.com")
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') {
    return '****@****';
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return '****@****';
  }

  const [local, domain] = parts;
  const maskedLocal = local.length > 1
    ? local[0] + '***'
    : '****';

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask a currency value for display
 *
 * @param {number} value - Value to mask
 * @param {string} currency - Currency symbol (default: 'R$')
 * @returns {string} Masked value (e.g., "R$ ****")
 */
function maskCurrency(value, currency = 'R$') {
  return `${currency} ****`;
}

module.exports = {
  createEncryptionService,
  hash,
  generateToken,
  generateUUID,
  maskText,
  maskPhone,
  maskEmail,
  maskCurrency
};
