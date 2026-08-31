import type { PoolClient } from 'pg';

import { pool } from './connection';

/**
 * Owns a single database transaction. The service decides what belongs inside
 * the transaction (the boundary); the data-access layer alone acquires the
 * connection and issues BEGIN / COMMIT / ROLLBACK.
 */
export interface IUnitOfWork {
  withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
}

export class PgUnitOfWork implements IUnitOfWork {
  async withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
