import { PoolClient } from 'pg';
import { pool } from './connection';
import { IUnitOfWork } from './unit-of-work';

export class UnitOfWork implements IUnitOfWork {
  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original failure over any rollback failure.
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
