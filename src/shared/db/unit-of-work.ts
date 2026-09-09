import { Pool, PoolClient } from 'pg';
import { pool as defaultPool } from './connection';

/**
 * Service-owned transaction boundary. The service decides what is atomic; this
 * data-access implementation acquires the client, issues BEGIN/COMMIT/ROLLBACK,
 * and always releases. This is the ONLY place in the codebase that issues
 * BEGIN / COMMIT / ROLLBACK (AGENTS.md transaction-boundary decision).
 */
export interface IUnitOfWork {
  withTransaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T>;
}

export class PgUnitOfWork implements IUnitOfWork {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  async withTransaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
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
