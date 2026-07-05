import { Knex } from 'knex';

export abstract class BaseRepository<T> {
  protected abstract readonly tableName: string;

  constructor(protected readonly knex: Knex) {}

  async findById(id: string): Promise<T | null> {
    const result = await this.knex(this.tableName).where({ id }).first();
    return result ?? null;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    const query = this.knex(this.tableName);
    if (filter) {
      query.where(filter as Record<string, unknown>);
    }
    return query;
  }

  async create(data: Partial<T>): Promise<T> {
    const [result] = await this.knex(this.tableName).insert(data as Record<string, unknown>).returning('*');
    return result;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const [result] = await this.knex(this.tableName)
      .where({ id })
      .update(data as Record<string, unknown>)
      .returning('*');
    return result ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.knex(this.tableName).where({ id }).delete();
    return count > 0;
  }
}
