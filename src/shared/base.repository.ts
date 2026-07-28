import { Knex } from 'knex';

export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Record<string, unknown>): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export abstract class KnexBaseRepository<T> implements IBaseRepository<T> {
  constructor(protected readonly knex: Knex, protected readonly tableName: string) {}

  async findById(id: string): Promise<T | null> {
    const row = await this.knex(this.tableName).where({ id }).first();
    return row ?? null;
  }

  async findAll(filter?: Record<string, unknown>): Promise<T[]> {
    const query = this.knex(this.tableName);
    if (filter) {
      query.where(filter);
    }
    return query;
  }

  async create(entity: Partial<T>): Promise<T> {
    const [row] = await this.knex(this.tableName).insert(entity).returning('*');
    return row;
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    const [row] = await this.knex(this.tableName).where({ id }).update(entity).returning('*');
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.knex(this.tableName).where({ id }).del();
  }
}
