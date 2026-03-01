/**
 * Batch Operations Utility
 *
 * Provides efficient batch insert and update operations for Supabase.
 * Includes retry logic with exponential backoff for resilience.
 */
const { addTimestamps, addUpdatedAt } = require('./timestamps-middleware');

/**
 * Default batch size for operations
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2
};

/**
 * Sleep for a specified duration
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry with exponential backoff
 *
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt, config = DEFAULT_RETRY_CONFIG) {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Split array into chunks
 *
 * @param {Array} array - Array to split
 * @param {number} size - Chunk size
 * @returns {Array<Array>} Array of chunks
 */
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Execute operation with retry logic
 *
 * @param {Function} operation - Async operation to execute
 * @param {Object} options - Retry options
 * @returns {Promise<*>} Operation result
 * @throws {Error} If all retries fail
 */
async function withRetry(operation, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Batch insert records into a table
 *
 * @param {Object} supabase - Supabase client instance
 * @param {string} table - Table name
 * @param {Array<Object>} records - Records to insert
 * @param {Object} options - Options
 * @param {number} options.batchSize - Records per batch (default: 100)
 * @param {boolean} options.addTimestamps - Add created_at/updated_at (default: true)
 * @param {boolean} options.returnData - Return inserted records (default: false)
 * @param {Object} options.retry - Retry configuration
 * @returns {Promise<Object>} Result with counts and optional data
 *
 * @example
 * const result = await batchInsert(supabase, 'transactions', transactions, {
 *   batchSize: 50,
 *   addTimestamps: true
 * });
 * // { success: true, inserted: 150, failed: 0, batches: 3 }
 */
async function batchInsert(supabase, table, records, options = {}) {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    addTimestamps: shouldAddTimestamps = true,
    returnData = false,
    retry = DEFAULT_RETRY_CONFIG
  } = options;

  if (!Array.isArray(records) || records.length === 0) {
    return { success: true, inserted: 0, failed: 0, batches: 0, data: [] };
  }

  // Prepare records with timestamps
  const preparedRecords = shouldAddTimestamps
    ? records.map(record => addTimestamps(record))
    : records;

  const batches = chunk(preparedRecords, batchSize);
  const results = {
    success: true,
    inserted: 0,
    failed: 0,
    batches: batches.length,
    errors: [],
    data: []
  };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      const result = await withRetry(async () => {
        let query = supabase.from(table).insert(batch);

        if (returnData) {
          query = query.select();
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        return data;
      }, retry);

      results.inserted += batch.length;

      if (returnData && result) {
        results.data.push(...result);
      }
    } catch (error) {
      results.success = false;
      results.failed += batch.length;
      results.errors.push({
        batchIndex: i,
        recordCount: batch.length,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Batch update records in a table
 *
 * @param {Object} supabase - Supabase client instance
 * @param {string} table - Table name
 * @param {Array<Object>} updates - Updates with id and data
 * @param {Object} options - Options
 * @param {number} options.batchSize - Updates per batch (default: 100)
 * @param {boolean} options.addTimestamp - Add updated_at (default: true)
 * @param {string} options.idField - ID field name (default: 'id')
 * @param {Object} options.retry - Retry configuration
 * @returns {Promise<Object>} Result with counts
 *
 * @example
 * const result = await batchUpdate(supabase, 'users', [
 *   { id: 1, data: { status: 'active' } },
 *   { id: 2, data: { status: 'inactive' } }
 * ]);
 */
async function batchUpdate(supabase, table, updates, options = {}) {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    addTimestamp = true,
    idField = 'id',
    retry = DEFAULT_RETRY_CONFIG
  } = options;

  if (!Array.isArray(updates) || updates.length === 0) {
    return { success: true, updated: 0, failed: 0, batches: 0 };
  }

  const batches = chunk(updates, batchSize);
  const results = {
    success: true,
    updated: 0,
    failed: 0,
    batches: batches.length,
    errors: []
  };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    for (const update of batch) {
      const { id, data } = update;

      if (!id || !data) {
        results.failed++;
        results.errors.push({
          id,
          error: 'Missing id or data'
        });
        continue;
      }

      try {
        await withRetry(async () => {
          const updateData = addTimestamp ? addUpdatedAt(data) : data;

          const { error } = await supabase
            .from(table)
            .update(updateData)
            .eq(idField, id);

          if (error) {
            throw error;
          }
        }, retry);

        results.updated++;
      } catch (error) {
        results.success = false;
        results.failed++;
        results.errors.push({
          id,
          error: error.message
        });
      }
    }
  }

  return results;
}

/**
 * Batch upsert records (insert or update)
 *
 * @param {Object} supabase - Supabase client instance
 * @param {string} table - Table name
 * @param {Array<Object>} records - Records to upsert
 * @param {Object} options - Options
 * @param {number} options.batchSize - Records per batch (default: 100)
 * @param {string} options.onConflict - Conflict column(s)
 * @param {boolean} options.addTimestamps - Add timestamps (default: true)
 * @param {Object} options.retry - Retry configuration
 * @returns {Promise<Object>} Result with counts
 *
 * @example
 * const result = await batchUpsert(supabase, 'transactions', records, {
 *   onConflict: 'uuid'
 * });
 */
async function batchUpsert(supabase, table, records, options = {}) {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    onConflict,
    addTimestamps: shouldAddTimestamps = true,
    returnData = false,
    retry = DEFAULT_RETRY_CONFIG
  } = options;

  if (!Array.isArray(records) || records.length === 0) {
    return { success: true, upserted: 0, failed: 0, batches: 0, data: [] };
  }

  const preparedRecords = shouldAddTimestamps
    ? records.map(record => addTimestamps(record))
    : records;

  const batches = chunk(preparedRecords, batchSize);
  const results = {
    success: true,
    upserted: 0,
    failed: 0,
    batches: batches.length,
    errors: [],
    data: []
  };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      const result = await withRetry(async () => {
        let query = supabase.from(table).upsert(batch, {
          onConflict,
          ignoreDuplicates: false
        });

        if (returnData) {
          query = query.select();
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        return data;
      }, retry);

      results.upserted += batch.length;

      if (returnData && result) {
        results.data.push(...result);
      }
    } catch (error) {
      results.success = false;
      results.failed += batch.length;
      results.errors.push({
        batchIndex: i,
        recordCount: batch.length,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Batch delete records from a table
 *
 * @param {Object} supabase - Supabase client instance
 * @param {string} table - Table name
 * @param {Array<*>} ids - IDs to delete
 * @param {Object} options - Options
 * @param {number} options.batchSize - IDs per batch (default: 100)
 * @param {string} options.idField - ID field name (default: 'id')
 * @param {Object} options.retry - Retry configuration
 * @returns {Promise<Object>} Result with counts
 */
async function batchDelete(supabase, table, ids, options = {}) {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    idField = 'id',
    retry = DEFAULT_RETRY_CONFIG
  } = options;

  if (!Array.isArray(ids) || ids.length === 0) {
    return { success: true, deleted: 0, failed: 0, batches: 0 };
  }

  const batches = chunk(ids, batchSize);
  const results = {
    success: true,
    deleted: 0,
    failed: 0,
    batches: batches.length,
    errors: []
  };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from(table)
          .delete()
          .in(idField, batch);

        if (error) {
          throw error;
        }
      }, retry);

      results.deleted += batch.length;
    } catch (error) {
      results.success = false;
      results.failed += batch.length;
      results.errors.push({
        batchIndex: i,
        idCount: batch.length,
        error: error.message
      });
    }
  }

  return results;
}

module.exports = {
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
