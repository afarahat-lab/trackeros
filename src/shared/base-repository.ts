import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { pool } from 'shared/db/connection';

export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

export abstract class BaseRepository<T extends { id: string }> implements IBaseRepository<T> {
  protected abstract readonly tableName: string;
  protected readonly pool: Pool;

  constructor(poolOverride?: Pool) {
    this.pool = poolOverride ?? pool;
  }

  async findById(id: string): Promise<T | null> {
    const result: QueryResult<T> = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<T[]> {
    const result: QueryResult<T> = await this.pool.query(
      `SELECT * FROM ${this.tableName}`,
    );
    return result.rows;
  }

  async create(entity: Omit<T, 'id'>): Promise<T> {
    const keys = Object.keys(entity as Record<string, unknown>);
    const values = Object.values(entity as Record<string, unknown>);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const result: QueryResult<T> = await this.pool.query(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return result.rows[0];
  }

  async update(id: string, entity: Partial<T>): Promise<T | null> {
    const keys = Object.keys(entity as Record<string, unknown>);
    if (keys.length === 0) {
      return this.findById(id);
    }

    const values = Object.values(entity as Record<string, unknown>);
    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const result: QueryResult<T> = await this.pool.query(
      `UPDATE ${this.tableName} SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id],
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result: QueryResult = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  protected async queryWithClient<R extends QueryResultRow>(
    client: PoolClient,
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<R>> {
    return client.query<R>(sql, params);
  }
}
