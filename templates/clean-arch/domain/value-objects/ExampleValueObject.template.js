/**
 * @template ExampleValueObject
 * Template for creating domain value objects
 *
 * USAGE:
 * 1. Copy this file to your service's src/domain/value-objects/
 * 2. Rename to your value object name (e.g., Email.js, PhoneNumber.js)
 * 3. Replace ExampleValueObject with your value object name
 *
 * CLEAN ARCHITECTURE NOTES:
 * - Value Objects are immutable
 * - They are identified by their values, not by identity
 * - They should validate themselves on creation
 * - Use for: emails, phone numbers, money, addresses, etc.
 */

/**
 * ExampleValueObject - represents a {{description}}
 *
 * Value Objects are:
 * - Immutable: once created, they cannot be changed
 * - Compared by value: two VOs with same values are equal
 * - Self-validating: creation fails if data is invalid
 */
class ExampleValueObject {
  constructor(value) {
    // Validate on construction
    if (!ExampleValueObject.isValid(value)) {
      throw new Error(`Invalid ExampleValueObject: ${value}`);
    }

    // Make immutable
    this._value = value;
    Object.freeze(this);
  }

  /**
   * Get the underlying value
   */
  get value() {
    return this._value;
  }

  /**
   * Static validation method
   * @param {any} value - Value to validate
   * @returns {boolean}
   */
  static isValid(value) {
    // Add your validation logic here
    // Example for email:
    // return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return value !== null && value !== undefined;
  }

  /**
   * Factory method with validation
   * Returns null instead of throwing if invalid
   */
  static createOrNull(value) {
    try {
      return new ExampleValueObject(value);
    } catch {
      return null;
    }
  }

  /**
   * Equality comparison
   * @param {ExampleValueObject} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof ExampleValueObject)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * String representation
   */
  toString() {
    return String(this._value);
  }

  /**
   * JSON serialization
   */
  toJSON() {
    return this._value;
  }
}

module.exports = ExampleValueObject;
