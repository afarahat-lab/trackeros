import { Pool, PoolClient } from 'pg';

export abstract class BaseRepository<T> {
  constructor(protected readonly pool: Pool) {}

  abstract findById(id: string, client?: PoolClient): Promise<T | null>;
  abstract findAll(filters?: Record<string, any>, client?: PoolClient): Promise<T[]>;
  abstract create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, client?: PoolClient): Promise<T>;
  abstract update(id: string, updates: Partial<T>, client?: PoolClient): Promise<T>;
  abstract delete(id: string, client?: PoolClient): Promise<void>;
}
