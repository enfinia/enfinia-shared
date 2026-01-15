const RepositoryPort = require('../../application/ports/RepositoryPort');

/**
 * Base class for Supabase repositories
 * Implements RepositoryPort with common Supabase operations
 */
class BaseRepository extends RepositoryPort {
  /**
   * @param {Object} dbService - Database service instance
   * @param {string} tableName - Name of the database table
   * @param {Function} EntityClass - Entity class constructor
   */
  constructor(dbService, tableName, EntityClass = null) {
    super();
    this.db = dbService;
    this.table = tableName;
    this.EntityClass = EntityClass;
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

  async findById(id) {
    const row = await this.db.buscarUnico(this.table, { id });
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
    const row = await this.db.inserir(this.table, data);
    return this.toEntity(row);
  }

  async update(id, data) {
    const row = await this.db.atualizar(this.table, { id }, data);
    return this.toEntity(row);
  }

  async delete(id) {
    return await this.db.deletar(this.table, { id });
  }
}

module.exports = BaseRepository;
