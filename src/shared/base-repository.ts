
import { Pool, QueryResult } from 'pg';
import { pool } from './db/connection';

export abstract class BaseRepository<T> {
  protected readonly pool: Pool;

  constructor(poolOverride?: Pool) {
    this.pool = poolOverride ?? pool;
  }

  protected async query(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult> {
    return this.pool.query(text, params);
  }

  abstract findById(id: string): Promise<T | null>;
}
