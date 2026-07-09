import { Pool } from 'pg';

export abstract class BaseRepository<T> {
  protected readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  abstract findById(id: string): Promise<T | null>;
  abstract findAll(filters?: Record<string, unknown>): Promise<T[]>;
  abstract create(entity: Partial<T>): Promise<T>;
  abstract update(id: string, updates: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
