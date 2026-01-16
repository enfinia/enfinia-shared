const crypto = require('crypto');

/**
 * UUID v4 regex pattern for validation
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Base class for domain entities
 * Entities have identity (id, uuid) and lifecycle (created/updated)
 */
class BaseEntity {
  constructor({ id, uuid, created_at, updated_at, ...props }) {
    this.id = id;
    this.uuid = uuid || null;
    this.createdAt = created_at ? new Date(created_at) : null;
    this.updatedAt = updated_at ? new Date(updated_at) : null;

    // Allow subclasses to define their own properties
    Object.keys(props).forEach(key => {
      this[this._toCamelCase(key)] = props[key];
    });
  }

  /**
   * Check if entity is new (not yet persisted)
   */
  isNew() {
    return !this.id && !this.uuid;
  }

  /**
   * Check if entity has a valid UUID
   */
  hasUUID() {
    return this.uuid && UUID_PATTERN.test(this.uuid);
  }

  /**
   * Get the primary identifier (prefer UUID over id)
   */
  getIdentifier() {
    return this.uuid || this.id;
  }

  /**
   * Generate a new UUID v4
   * @returns {string} A new UUID v4 string
   */
  static generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Validate if a string is a valid UUID v4
   * @param {string} uuid - The string to validate
   * @returns {boolean} True if valid UUID v4
   */
  static isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }
    return UUID_PATTERN.test(uuid);
  }

  /**
   * Generate a UUID for this entity if it doesn't have one
   * @returns {string} The entity's UUID (new or existing)
   */
  ensureUUID() {
    if (!this.uuid) {
      this.uuid = BaseEntity.generateUUID();
    }
    return this.uuid;
  }

  /**
   * Convert snake_case to camelCase
   */
  _toCamelCase(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert back to snake_case for persistence
   */
  toSnakeCase(obj) {
    const result = {};
    Object.keys(obj).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = obj[key];
    });
    return result;
  }

  /**
   * Return plain object for serialization
   */
  toJSON() {
    const { createdAt, updatedAt, ...rest } = this;
    return {
      ...rest,
      id: this.id,
      uuid: this.uuid,
      created_at: createdAt?.toISOString(),
      updated_at: updatedAt?.toISOString()
    };
  }

  /**
   * Return data object for persistence (snake_case)
   */
  toPersistence() {
    const json = this.toJSON();
    return this.toSnakeCase(json);
  }
}

module.exports = BaseEntity;
