import { PoolClient } from 'pg';

export interface IUnitOfWork {
  withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
}
