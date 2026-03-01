const RepositoryPort = require('../../application/ports/RepositoryPort');
const { generateUUID, isValidUUID } = require('../../infrastructure/database/uuid-generator');
const { addTimestamps, addUpdatedAt, getCurrentTimestamp } = require('../../infrastructure/database/timestamps-middleware');

/**
 * Base class for Supabase repositories
 * Implements RepositoryPort with common Supabase operations
 * Includes automatic UUID generation and timestamp management
 */
class BaseRepository extends RepositoryPort {
  /**
   * @param {Object} dbService - Database service instance
   * @param {string} tableName - Name of the database table
   * @param {Function} EntityClass - Entity class constructor
   * @param {Object} options - Additional options
   * @param {boolean} options.useUUID - Whether to use UUID for new records (default: true)
   * @param {boolean} options.autoTimestamps - Whether to auto-manage timestamps (default: true)
   * @param {string} options.uuidField - Name of UUID field (default: 'uuid')
   */
  constructor(dbService, tableName, EntityClass = null, options = {}) {
    super();
    this.db = dbService;
    this.table = tableName;
    this.EntityClass = EntityClass;
    this.useUUID = options.useUUID !== false;
    this.autoTimestamps = options.autoTimestamps !== false;
    this.uuidField = options.uuidField || 'uuid';
  }

  /**
   * Convert database row to entity
   */
  toEntity(row) {
    if (!row) return null;
    if (this.EntityClass) {
      return new this.EntityClass(row);
    }
    return row;
  }

  /**
   * Convert multiple rows to entities
   */
  toEntities(rows) {
    return rows.map(row => this.toEntity(row));
  }

  /**
   * Prepare data for insert with UUID and timestamps
   */
  prepareForInsert(data) {
    let prepared = { ...data };

    // Add UUID if enabled and not provided
    if (this.useUUID && !prepared[this.uuidField]) {
      prepared[this.uuidField] = generateUUID();
    }

    // Add timestamps if enabled
    if (this.autoTimestamps) {
      prepared = addTimestamps(prepared);
    }

    return prepared;
  }

  /**
   * Prepare data for update with updated_at timestamp
   */
  prepareForUpdate(data) {
    if (this.autoTimestamps) {
      return addUpdatedAt(data);
    }
    return data;
  }

  async findById(id) {
    const row = await this.db.buscarUnico(this.table, { id });
    return this.toEntity(row);
  }

  /**
   * Find by UUID
   */
  async findByUUID(uuid) {
    if (!isValidUUID(uuid)) {
      return null;
    }
    const row = await this.db.buscarUnico(this.table, { [this.uuidField]: uuid });
    return this.toEntity(row);
  }

  async findOne(criteria) {
    const row = await this.db.buscarUnico(this.table, criteria);
    return this.toEntity(row);
  }

  async findAll(criteria = {}, options = {}) {
    const rows = await this.db.buscarTodos(this.table, criteria, options);
    return this.toEntities(rows);
  }

  async create(data) {
    const prepared = this.prepareForInsert(data);
    const row = await this.db.inserir(this.table, prepared);
    return this.toEntity(row);
  }

  async update(id, data) {
    const prepared = this.prepareForUpdate(data);
    const row = await this.db.atualizar(this.table, { id }, prepared);
    return this.toEntity(row);
  }

  /**
   * Update by UUID
   */
  async updateByUUID(uuid, data) {
    if (!isValidUUID(uuid)) {
      throw new Error('Invalid UUID');
    }
    const prepared = this.prepareForUpdate(data);
    const row = await this.db.atualizar(this.table, { [this.uuidField]: uuid }, prepared);
    return this.toEntity(row);
  }

  async delete(id) {
    return await this.db.deletar(this.table, { id });
  }

  /**
   * Delete by UUID
   */
  async deleteByUUID(uuid) {
    if (!isValidUUID(uuid)) {
      throw new Error('Invalid UUID');
    }
    return await this.db.deletar(this.table, { [this.uuidField]: uuid });
  }

  /**
   * Get current timestamp (utility for subclasses)
   */
  getCurrentTimestamp() {
    return getCurrentTimestamp();
  }

  /**
   * Generate a new UUID (utility for subclasses)
   */
  generateUUID() {
    return generateUUID();
  }
}

module.exports = BaseRepository;
