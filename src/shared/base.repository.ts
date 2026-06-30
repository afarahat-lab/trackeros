import { Knex } from 'knex';

export abstract class BaseRepository<T> {
  protected readonly knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  abstract findById(id: string | number): Promise<T | undefined>;
  abstract findAll(): Promise<T[]>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string | number, data: Partial<T>): Promise<T | undefined>;
  abstract delete(id: string | number): Promise<boolean>;
}
