
import { Pool, QueryResult } from 'pg';

export abstract class BaseRepository<T extends { id: string }> {
  protected abstract readonly tableName: string;

  constructor(protected readonly pool: Pool) {}

  async findById(id: string): Promise<T | null> {
    const result: QueryResult<T> = await this.pool.query(
      `SELECT * FROM "${this.tableName}" WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<T[]> {
    const result: QueryResult<T> = await this.pool.query(
      `SELECT * FROM "${this.tableName}"`
    );
    return result.rows;
  }

  async insert(entity: T): Promise<T> {
    const keys = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map((k) => `"${k}"`).join(', ');

    const result: QueryResult<T> = await this.pool.query(
      `INSERT INTO "${this.tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<Omit<T, 'id'>>): Promise<T | null> {
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return this.findById(id);
    }

    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map((k) => (updates as Record<string, unknown>)[k]);

    const result: QueryResult<T> = await this.pool.query(
      `UPDATE "${this.tableName}" SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM "${this.tableName}" WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
