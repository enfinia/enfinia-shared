/**
 * Timestamps Middleware
 *
 * Provides automatic timestamp management for database operations.
 * Ensures created_at and updated_at fields are properly set.
 */

/**
 * Get current UTC timestamp in ISO format
 *
 * @returns {string} Current UTC timestamp in ISO format
 *
 * @example
 * getCurrentTimestamp(); // '2026-01-15T10:30:00.000Z'
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Add created_at timestamp to data object for INSERT operations
 *
 * @param {Object} data - The data object to augment
 * @param {boolean} [overwrite=false] - Whether to overwrite existing created_at
 * @returns {Object} Data with created_at timestamp
 *
 * @example
 * addCreatedAt({ name: 'John' }); // { name: 'John', created_at: '2026-01-15T10:30:00.000Z' }
 */
function addCreatedAt(data, overwrite = false) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (overwrite || !data.created_at) {
    return {
      ...data,
      created_at: getCurrentTimestamp()
    };
  }

  return data;
}

/**
 * Add updated_at timestamp to data object for UPDATE operations
 *
 * @param {Object} data - The data object to augment
 * @returns {Object} Data with updated_at timestamp
 *
 * @example
 * addUpdatedAt({ name: 'John' }); // { name: 'John', updated_at: '2026-01-15T10:30:00.000Z' }
 */
function addUpdatedAt(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  return {
    ...data,
    updated_at: getCurrentTimestamp()
  };
}

/**
 * Add both created_at and updated_at for new records
 *
 * @param {Object} data - The data object to augment
 * @returns {Object} Data with both timestamps
 *
 * @example
 * addTimestamps({ name: 'John' });
 * // { name: 'John', created_at: '2026-01-15T10:30:00.000Z', updated_at: '2026-01-15T10:30:00.000Z' }
 */
function addTimestamps(data) {
  const timestamp = getCurrentTimestamp();

  if (!data || typeof data !== 'object') {
    return data;
  }

  return {
    ...data,
    created_at: data.created_at || timestamp,
    updated_at: timestamp
  };
}

/**
 * Process an array of records, adding timestamps to each
 *
 * @param {Array<Object>} records - Array of data objects
 * @param {'create'|'update'} operation - The type of operation
 * @returns {Array<Object>} Records with timestamps added
 *
 * @example
 * processRecords([{ name: 'John' }, { name: 'Jane' }], 'create');
 */
function processRecords(records, operation = 'create') {
  if (!Array.isArray(records)) {
    return records;
  }

  const processor = operation === 'create' ? addTimestamps : addUpdatedAt;
  return records.map(record => processor(record));
}

/**
 * Create a Supabase-compatible timestamp config
 * Can be used with Supabase client extensions
 *
 * @returns {Object} Configuration object for timestamp handling
 */
function createTimestampConfig() {
  return {
    onInsert: addTimestamps,
    onUpdate: addUpdatedAt,
    getCurrentTimestamp,
    timezone: 'UTC'
  };
}

/**
 * Parse timestamp string to Date object
 *
 * @param {string|Date|null} timestamp - Timestamp to parse
 * @returns {Date|null} Parsed Date object or null
 */
function parseTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  if (timestamp instanceof Date) {
    return timestamp;
  }

  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format Date to ISO timestamp string
 *
 * @param {Date|string|null} date - Date to format
 * @returns {string|null} ISO formatted timestamp or null
 */
function formatTimestamp(date) {
  if (!date) {
    return null;
  }

  const parsed = parseTimestamp(date);
  return parsed ? parsed.toISOString() : null;
}

/**
 * Check if a timestamp is within a time range
 *
 * @param {Date|string} timestamp - Timestamp to check
 * @param {Date|string} start - Range start
 * @param {Date|string} end - Range end
 * @returns {boolean} True if timestamp is within range
 */
function isWithinRange(timestamp, start, end) {
  const ts = parseTimestamp(timestamp);
  const startTs = parseTimestamp(start);
  const endTs = parseTimestamp(end);

  if (!ts || !startTs || !endTs) {
    return false;
  }

  return ts >= startTs && ts <= endTs;
}

/**
 * Get timestamp from N days ago
 *
 * @param {number} days - Number of days ago
 * @returns {string} ISO timestamp
 */
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * Get timestamp from N hours ago
 *
 * @param {number} hours - Number of hours ago
 * @returns {string} ISO timestamp
 */
function hoursAgo(hours) {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

module.exports = {
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
};
