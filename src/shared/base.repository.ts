
import { Knex } from 'knex';

export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export abstract class BaseKnexRepository<T extends { id: string }> implements IBaseRepository<T> {
  protected knex: Knex;
  protected tableName: string;

  constructor(knex: Knex, tableName: string) {
    this.knex = knex;
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const row = await this.knex(this.tableName).where({ id }).first();
    return row ?? null;
  }

  async findAll(): Promise<T[]> {
    return this.knex(this.tableName).select('*');
  }

  async create(entity: Omit<T, 'id'>): Promise<T> {
    const [row] = await this.knex(this.tableName).insert(entity).returning('*');
    return row;
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    const [row] = await this.knex(this.tableName)
      .where({ id })
      .update(entity)
      .returning('*');
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.knex(this.tableName).where({ id }).del();
  }
}
