import { Pool, QueryResult } from 'pg';
import { pool } from './connection';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract readonly tableName: string;

  protected get pool(): Pool {
    return pool;
  }

  async findById(id: string): Promise<T | null> {
    const result: QueryResult<T> = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<T[]> {
    if (!filters || Object.keys(filters).length === 0) {
      const result: QueryResult<T> = await this.pool.query(
        `SELECT * FROM ${this.tableName}`,
      );
      return result.rows;
    }

    const entries = Object.entries(filters);
    const clauses = entries.map(([key], index) => `${key} = $${index + 1}`);
    const values = entries.map(([, value]) => value);

    const result: QueryResult<T> = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE ${clauses.join(' AND ')}`,
      values,
    );
    return result.rows;
  }

  async create(
    entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<T> {
    const keys = Object.keys(entity as Record<string, unknown>);
    const values = Object.values(entity as Record<string, unknown>);
    const placeholders = keys.map((_, index) => `$${index + 1}`);

    const result: QueryResult<T> = await this.pool.query(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}, created_at, updated_at)
       VALUES (${placeholders.join(', ')}, NOW(), NOW())
       RETURNING *`,
      values,
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const entries = Object.entries(updates as Record<string, unknown>).filter(
      ([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt',
    );

    if (entries.length === 0) {
      const result: QueryResult<T> = await this.pool.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    }

    const setClauses = entries.map(
      ([key], index) => `${key} = $${index + 1}`,
    );
    const values = entries.map(([, value]) => value);
    values.push(id);

    const result: QueryResult<T> = await this.pool.query(
      `UPDATE ${this.tableName}
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
