/**
 * Base interface for repository ports
 * Ports define the contract that adapters must implement
 */
class RepositoryPort {
  /**
   * Find entity by ID
   * @param {number|string} id
   * @returns {Promise<Entity|null>}
   */
  async findById(id) {
    throw new Error('findById() must be implemented');
  }

  /**
   * Find all entities matching criteria
   * @param {Object} criteria - Filter criteria
   * @param {Object} options - Pagination, sorting options
   * @returns {Promise<Entity[]>}
   */
  async findAll(criteria = {}, options = {}) {
    throw new Error('findAll() must be implemented');
  }

  /**
   * Create new entity
   * @param {Object} data - Entity data
   * @returns {Promise<Entity>}
   */
  async create(data) {
    throw new Error('create() must be implemented');
  }

  /**
   * Update existing entity
   * @param {number|string} id
   * @param {Object} data - Fields to update
   * @returns {Promise<Entity|null>}
   */
  async update(id, data) {
    throw new Error('update() must be implemented');
  }

  /**
   * Delete entity
   * @param {number|string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('delete() must be implemented');
  }
}

module.exports = RepositoryPort;
