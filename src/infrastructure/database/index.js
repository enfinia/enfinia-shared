/**
 * Database Infrastructure Module
 *
 * Exports all database-related utilities and clients.
 */

const {
  createSupabaseClient,
  getSupabaseClient,
  resetSupabaseClient,
  createRequestScopedClient,
  supabaseMiddleware,
  checkDatabaseHealth,
  defaultOptions
} = require('./supabase-client');

const {
  generateUUID,
  isValidUUID,
  parseUUID,
  ensureUUID,
  extractUUID,
  uuidEquals,
  UUID_PATTERN
} = require('./uuid-generator');

const {
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
} = require('./timestamps-middleware');

const {
  batchInsert,
  batchUpdate,
  batchUpsert,
  batchDelete,
  withRetry,
  chunk,
  sleep,
  calculateDelay,
  DEFAULT_BATCH_SIZE,
  DEFAULT_RETRY_CONFIG
} = require('./batch-operations');

module.exports = {
  // Supabase Client
  createSupabaseClient,
  getSupabaseClient,
  resetSupabaseClient,
  createRequestScopedClient,
  supabaseMiddleware,
  checkDatabaseHealth,
  defaultOptions,

  // UUID Utilities
  generateUUID,
  isValidUUID,
  parseUUID,
  ensureUUID,
  extractUUID,
  uuidEquals,
  UUID_PATTERN,

  // Timestamp Utilities
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
  hoursAgo,

  // Batch Operations
  batchInsert,
  batchUpdate,
  batchUpsert,
  batchDelete,
  withRetry,
  chunk,
  sleep,
  calculateDelay,
  DEFAULT_BATCH_SIZE,
  DEFAULT_RETRY_CONFIG
};
