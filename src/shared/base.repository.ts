import { Pool, QueryResult } from 'pg';
import { BaseEntity } from './types';
import { randomUUID } from 'crypto';

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract readonly tableName: string;

  constructor(protected readonly pool: Pool) {}

  async findById(id: string): Promise<T | null> {
    const result: QueryResult<T> = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<T[]> {
    const result: QueryResult<T> = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`,
    );
    return result.rows;
  }

  async create(entity: Omit<T, keyof BaseEntity>): Promise<T> {
    const id = randomUUID();
    const now = new Date();
    const columns = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const result: QueryResult<T> = await this.pool.query(
      `INSERT INTO ${this.tableName} (id, created_at, updated_at, ${columns.join(', ')})
       VALUES ($1, $2, $3, ${placeholders.map((_, i) => `$${i + 4}`).join(', ')})
       RETURNING *`,
      [id, now, now, ...values],
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<Omit<T, keyof BaseEntity>>): Promise<T | null> {
    const now = new Date();
    const columns = Object.keys(updates);
    const values = Object.values(updates);
    const setClauses = columns.map((col, i) => `${col} = $${i + 2}`);

    const result: QueryResult<T> = await this.pool.query(
      `UPDATE ${this.tableName}
       SET updated_at = $1, ${setClauses.join(', ')}
       WHERE id = $${columns.length + 2} AND deleted_at IS NULL
       RETURNING *`,
      [now, ...values, id],
    );
    return result.rows[0] ?? null;
  }

  async softDelete(id: string): Promise<T | null> {
    const now = new Date();
    const result: QueryResult<T> = await this.pool.query(
      `UPDATE ${this.tableName}
       SET deleted_at = $1, updated_at = $1
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [now, id],
    );
    return result.rows[0] ?? null;
  }
}
