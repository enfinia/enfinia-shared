/**
 * UUID Generator Utility
 *
 * Provides UUID v4 generation and validation for database operations.
 * Uses Node.js native crypto module for secure random UUID generation.
 */
const crypto = require('crypto');

/**
 * UUID v4 regex pattern for validation
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a new UUID v4
 *
 * @returns {string} A new UUID v4 string
 *
 * @example
 * const uuid = generateUUID();
 * // => '550e8400-e29b-41d4-a716-446655440000'
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Validate if a string is a valid UUID v4
 *
 * @param {string} uuid - The string to validate
 * @returns {boolean} True if valid UUID v4, false otherwise
 *
 * @example
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true
 * isValidUUID('not-a-uuid'); // false
 * isValidUUID(null); // false
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  return UUID_PATTERN.test(uuid);
}

/**
 * Parse a UUID string, returning null if invalid
 *
 * @param {string} uuid - The string to parse
 * @returns {string|null} The UUID if valid, null otherwise
 *
 * @example
 * parseUUID('550e8400-e29b-41d4-a716-446655440000'); // '550e8400-e29b-41d4-a716-446655440000'
 * parseUUID('invalid'); // null
 */
function parseUUID(uuid) {
  return isValidUUID(uuid) ? uuid.toLowerCase() : null;
}

/**
 * Generate a UUID or return the provided one if valid
 *
 * @param {string|null|undefined} existingUUID - An existing UUID to validate
 * @returns {string} The existing UUID if valid, otherwise a new UUID
 *
 * @example
 * ensureUUID('550e8400-e29b-41d4-a716-446655440000'); // returns the same UUID
 * ensureUUID(null); // generates new UUID
 * ensureUUID('invalid'); // generates new UUID
 */
function ensureUUID(existingUUID) {
  if (isValidUUID(existingUUID)) {
    return existingUUID.toLowerCase();
  }
  return generateUUID();
}

/**
 * Extract UUID from various formats (with or without dashes)
 *
 * @param {string} input - Input string that may contain a UUID
 * @returns {string|null} The formatted UUID or null if not found
 *
 * @example
 * extractUUID('550e8400e29b41d4a716446655440000'); // '550e8400-e29b-41d4-a716-446655440000'
 * extractUUID('550e8400-e29b-41d4-a716-446655440000'); // '550e8400-e29b-41d4-a716-446655440000'
 */
function extractUUID(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Already formatted
  if (isValidUUID(input)) {
    return input.toLowerCase();
  }

  // Try to format from hex string (32 chars without dashes)
  const hex = input.replace(/[^0-9a-f]/gi, '');
  if (hex.length === 32) {
    const formatted = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    if (isValidUUID(formatted)) {
      return formatted.toLowerCase();
    }
  }

  return null;
}

/**
 * Compare two UUIDs for equality (case-insensitive)
 *
 * @param {string} uuid1 - First UUID
 * @param {string} uuid2 - Second UUID
 * @returns {boolean} True if UUIDs are equal
 *
 * @example
 * uuidEquals('550E8400-E29B-41D4-A716-446655440000', '550e8400-e29b-41d4-a716-446655440000'); // true
 */
function uuidEquals(uuid1, uuid2) {
  const parsed1 = parseUUID(uuid1);
  const parsed2 = parseUUID(uuid2);

  if (parsed1 === null || parsed2 === null) {
    return false;
  }

  return parsed1 === parsed2;
}

module.exports = {
  generateUUID,
  isValidUUID,
  parseUUID,
  ensureUUID,
  extractUUID,
  uuidEquals,
  UUID_PATTERN
};
