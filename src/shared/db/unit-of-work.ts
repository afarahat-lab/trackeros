import type { PoolClient } from 'pg';

import { pool } from './connection';

/**
 * Unit-of-work abstraction. The service decides *what* belongs in a
 * transaction; this data-access component decides *how* the connection is
 * acquired and the transaction opened/committed/rolled back. It is the only
 * place in the codebase that issues BEGIN / COMMIT / ROLLBACK.
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
