/**
 * Base class for domain entities
 * Entities have identity (id) and lifecycle (created/updated)
 */
class BaseEntity {
  constructor({ id, created_at, updated_at, ...props }) {
    this.id = id;
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
    return !this.id;
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
      created_at: createdAt?.toISOString(),
      updated_at: updatedAt?.toISOString()
    };
  }
}

module.exports = BaseEntity;
