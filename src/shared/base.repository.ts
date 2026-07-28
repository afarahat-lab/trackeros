import { pool } from './db/connection';

export abstract class BaseRepository<T> {
  protected get db() {
    return pool;
  }

  async findById(id: string): Promise<T | null> {
    try {
      const tableName = this.getTableName();
      const result = await this.db.query(
        `SELECT * FROM ${tableName} WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find entity by id: ${(error as Error).message}`);
    }
  }

  async findAll(filters?: Record<string, unknown>): Promise<T[]> {
    try {
      const tableName = this.getTableName();
      let query = `SELECT * FROM ${tableName}`;
      const params: unknown[] = [];
      if (filters && Object.keys(filters).length > 0) {
        const clauses = Object.keys(filters).map((key, idx) => {
          params.push(filters[key]);
          return `${key} = $${idx + 1}`;
        });
        query += ` WHERE ${clauses.join(' AND ')}`;
      }
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to find entities: ${(error as Error).message}`);
    }
  }

  async create(entity: Partial<T>): Promise<T> {
    try {
      const tableName = this.getTableName();
      const keys = Object.keys(entity as Record<string, unknown>);
      const values = Object.values(entity as Record<string, unknown>);
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const columns = keys.join(', ');
      const result = await this.db.query(
        `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create entity: ${(error as Error).message}`);
    }
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    try {
      const tableName = this.getTableName();
      const keys = Object.keys(updates as Record<string, unknown>);
      const setClauses = keys.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
      const values = Object.values(updates as Record<string, unknown>);
      values.push(id);
      const result = await this.db.query(
        `UPDATE ${tableName} SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        throw new Error(`Entity with id ${id} not found`);
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update entity: ${(error as Error).message}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const tableName = this.getTableName();
      await this.db.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    } catch (error) {
      throw new Error(`Failed to delete entity: ${(error as Error).message}`);
    }
  }

  protected abstract getTableName(): string;
}
