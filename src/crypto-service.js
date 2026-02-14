const crypto = require('crypto');

/**
 * CryptoService
 *
 * Responsável por criptografar e descriptografar dados sensíveis
 * usando AES-256-CBC (reversível).
 */
class CryptoService {
  /**
   * Field types for type-aware encryption
   */
  static FIELD_TYPES = {
    PHONE: 'phone',
    VALUE: 'value',
    TEXT: 'text',
    JSON: 'json',
    NUMBER: 'number'
  };

  /**
   * Default sensitive fields by table
   */
  static SENSITIVE_FIELDS = {
    users: ['contact'],
    leads: ['contact'],
    invited_contacts: ['contact'],
    transactions: ['value', 'description'],
    financial_baseline: ['value'],
    financial_plan: ['value'],
    balance: ['month_credit', 'month_debit', 'investment', 'month_end_balance', 'initial_reserve', 'month_accumulated_reserve', 'total_reserve'],
    ai_decision_events: ['question', 'answer']
  };

  constructor() {
    this.secretKey = process.env.ENCRYPTION_KEY;

    if (!this.secretKey) {
      throw new Error('ENCRYPTION_KEY não configurada no arquivo .env');
    }

    if (this.secretKey.length < 32) {
      throw new Error('ENCRYPTION_KEY deve ter no mínimo 32 caracteres');
    }

    this.key = crypto.scryptSync(this.secretKey, 'salt', 32);
    this.algorithm = 'aes-256-cbc';
  }

  criptografar(texto) {
    if (texto === null || texto === undefined || texto === '') {
      return null;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(String(texto), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Erro ao criptografar:', error.message || error);
      return null;
    }
  }

  descriptografar(textoCriptografado) {
    if (!textoCriptografado || typeof textoCriptografado !== 'string') {
      return null;
    }

    try {
      const parts = textoCriptografado.split(':');

      if (parts.length !== 2) {
        throw new Error('Formato inválido de texto criptografado');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar:', error.message || error);
      return null;
    }
  }

  criptografarJSON(objeto) {
    if (objeto === null || objeto === undefined) {
      return null;
    }

    try {
      const json = JSON.stringify(objeto);
      return this.criptografar(json);
    } catch (error) {
      console.error('Erro ao criptografar JSON:', error.message || error);
      return null;
    }
  }

  descriptografarJSON(textoCriptografado) {
    if (!textoCriptografado) {
      return null;
    }

    try {
      const json = this.descriptografar(textoCriptografado);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('Erro ao descriptografar JSON:', error.message || error);
      return null;
    }
  }

  criptografarNumero(numero) {
    if (numero === null || numero === undefined) {
      return null;
    }

    return this.criptografar(String(numero));
  }

  descriptografarNumero(textoCriptografado) {
    if (!textoCriptografado) {
      return null;
    }

    const texto = this.descriptografar(textoCriptografado);
    if (!texto) {
      return null;
    }

    const numero = parseFloat(texto);
    return Number.isNaN(numero) ? null : numero;
  }

  mascararTexto(texto, mostrarInicio = 2, mostrarFim = 2) {
    if (!texto || typeof texto !== 'string') {
      return '****';
    }

    if (texto.length < 4) {
      return '****';
    }

    const inicio = texto.substring(0, mostrarInicio);
    const fim = texto.substring(texto.length - mostrarFim);
    const tamanhoMeio = Math.max(4, texto.length - mostrarInicio - mostrarFim);
    const meio = '*'.repeat(tamanhoMeio);

    return `${inicio}${meio}${fim}`;
  }

  mascararValor(valor) {
    if (valor === null || valor === undefined) {
      return 'R$ ****';
    }

    return 'R$ ****';
  }

  /**
   * Encrypt a field based on its type
   *
   * @param {*} value - Value to encrypt
   * @param {string} fieldType - Type of field (phone, value, text, json, number)
   * @returns {string|null} Encrypted value or null
   *
   * @example
   * crypto.encryptField('11999999999', 'phone');
   * crypto.encryptField(1500.50, 'value');
   * crypto.encryptField('sensitive text', 'text');
   */
  encryptField(value, fieldType = CryptoService.FIELD_TYPES.TEXT) {
    if (value === null || value === undefined) {
      return null;
    }

    switch (fieldType) {
      case CryptoService.FIELD_TYPES.NUMBER:
      case CryptoService.FIELD_TYPES.VALUE:
        return this.criptografarNumero(value);

      case CryptoService.FIELD_TYPES.JSON:
        return this.criptografarJSON(value);

      case CryptoService.FIELD_TYPES.PHONE:
      case CryptoService.FIELD_TYPES.TEXT:
      default:
        return this.criptografar(value);
    }
  }

  /**
   * Decrypt a field based on its type
   *
   * @param {string} encryptedValue - Encrypted value
   * @param {string} fieldType - Type of field (phone, value, text, json, number)
   * @returns {*} Decrypted value or null
   *
   * @example
   * crypto.decryptField(encrypted, 'phone');
   * crypto.decryptField(encrypted, 'value');
   */
  decryptField(encryptedValue, fieldType = CryptoService.FIELD_TYPES.TEXT) {
    if (!encryptedValue) {
      return null;
    }

    switch (fieldType) {
      case CryptoService.FIELD_TYPES.NUMBER:
      case CryptoService.FIELD_TYPES.VALUE:
        return this.descriptografarNumero(encryptedValue);

      case CryptoService.FIELD_TYPES.JSON:
        return this.descriptografarJSON(encryptedValue);

      case CryptoService.FIELD_TYPES.PHONE:
      case CryptoService.FIELD_TYPES.TEXT:
      default:
        return this.descriptografar(encryptedValue);
    }
  }

  /**
   * Encrypt specific fields in an object
   *
   * @param {Object} obj - Object with fields to encrypt
   * @param {Array<string>|Object} sensitiveFields - Field names or field config
   * @returns {Object} New object with encrypted fields
   *
   * @example
   * // Simple array of field names (all treated as text)
   * crypto.encryptObject({ name: 'John', phone: '11999999999' }, ['phone']);
   *
   * // With field types
   * crypto.encryptObject(
   *   { name: 'John', phone: '11999999999', amount: 1500 },
   *   { phone: 'phone', amount: 'value' }
   * );
   */
  encryptObject(obj, sensitiveFields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    if (Array.isArray(sensitiveFields)) {
      // Simple array: all fields treated as text
      for (const field of sensitiveFields) {
        if (result[field] !== undefined && result[field] !== null) {
          result[field] = this.encryptField(result[field], CryptoService.FIELD_TYPES.TEXT);
        }
      }
    } else if (typeof sensitiveFields === 'object') {
      // Object with field types
      for (const [field, fieldType] of Object.entries(sensitiveFields)) {
        if (result[field] !== undefined && result[field] !== null) {
          result[field] = this.encryptField(result[field], fieldType);
        }
      }
    }

    return result;
  }

  /**
   * Decrypt specific fields in an object
   *
   * @param {Object} obj - Object with encrypted fields
   * @param {Array<string>|Object} sensitiveFields - Field names or field config
   * @returns {Object} New object with decrypted fields
   *
   * @example
   * // Simple array of field names
   * crypto.decryptObject(encrypted, ['phone']);
   *
   * // With field types
   * crypto.decryptObject(encrypted, { phone: 'phone', amount: 'value' });
   */
  decryptObject(obj, sensitiveFields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    if (Array.isArray(sensitiveFields)) {
      for (const field of sensitiveFields) {
        if (result[field]) {
          result[field] = this.decryptField(result[field], CryptoService.FIELD_TYPES.TEXT);
        }
      }
    } else if (typeof sensitiveFields === 'object') {
      for (const [field, fieldType] of Object.entries(sensitiveFields)) {
        if (result[field]) {
          result[field] = this.decryptField(result[field], fieldType);
        }
      }
    }

    return result;
  }

  /**
   * Encrypt an object for a specific table using default sensitive fields
   *
   * @param {string} tableName - Table name
   * @param {Object} obj - Object to encrypt
   * @returns {Object} Object with sensitive fields encrypted
   *
   * @example
   * crypto.encryptForTable('users', { name: 'John', contact: '11999999999' });
   */
  encryptForTable(tableName, obj) {
    const fields = CryptoService.SENSITIVE_FIELDS[tableName];
    if (!fields || fields.length === 0) {
      return obj;
    }
    return this.encryptObject(obj, fields);
  }

  /**
   * Decrypt an object from a specific table using default sensitive fields
   *
   * @param {string} tableName - Table name
   * @param {Object} obj - Object to decrypt
   * @returns {Object} Object with sensitive fields decrypted
   *
   * @example
   * crypto.decryptFromTable('users', row);
   */
  decryptFromTable(tableName, obj) {
    const fields = CryptoService.SENSITIVE_FIELDS[tableName];
    if (!fields || fields.length === 0) {
      return obj;
    }
    return this.decryptObject(obj, fields);
  }

  /**
   * Encrypt multiple objects (array) for a table
   *
   * @param {string} tableName - Table name
   * @param {Array<Object>} objects - Array of objects to encrypt
   * @returns {Array<Object>} Array with encrypted objects
   */
  encryptArrayForTable(tableName, objects) {
    if (!Array.isArray(objects)) {
      return objects;
    }
    return objects.map(obj => this.encryptForTable(tableName, obj));
  }

  /**
   * Decrypt multiple objects (array) from a table
   *
   * @param {string} tableName - Table name
   * @param {Array<Object>} objects - Array of objects to decrypt
   * @returns {Array<Object>} Array with decrypted objects
   */
  decryptArrayFromTable(tableName, objects) {
    if (!Array.isArray(objects)) {
      return objects;
    }
    return objects.map(obj => this.decryptFromTable(tableName, obj));
  }

  /**
   * Check if a value appears to be encrypted (has the IV:encrypted format)
   *
   * @param {string} value - Value to check
   * @returns {boolean} True if value appears encrypted
   */
  isEncrypted(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const parts = value.split(':');
    if (parts.length !== 2) {
      return false;
    }

    // IV should be 32 hex chars (16 bytes)
    const [iv, encrypted] = parts;
    return /^[0-9a-f]{32}$/i.test(iv) && encrypted.length > 0;
  }

  /**
   * Get sensitive fields configuration for a table
   *
   * @param {string} tableName - Table name
   * @returns {Array<string>} Array of sensitive field names
   */
  static getSensitiveFields(tableName) {
    return CryptoService.SENSITIVE_FIELDS[tableName] || [];
  }

  /**
   * Register custom sensitive fields for a table
   *
   * @param {string} tableName - Table name
   * @param {Array<string>} fields - Array of sensitive field names
   */
  static registerSensitiveFields(tableName, fields) {
    CryptoService.SENSITIVE_FIELDS[tableName] = fields;
  }
}

module.exports = CryptoService;
