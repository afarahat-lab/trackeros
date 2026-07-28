import { pool } from './db/connection';

export abstract class BaseRepository<T> {
  protected get db() {
    return pool;
  }

  abstract findById(id: string): Promise<T | null>;
  abstract findAll(filters?: Record<string, unknown>): Promise<T[]>;
  abstract create(entity: Partial<T>): Promise<T>;
  abstract update(id: string, updates: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
