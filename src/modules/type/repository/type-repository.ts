import { Type } from '../domain/type';

export class TypeRepository {
  async findAll(): Promise<Type[]> {
    // Implementation to fetch all types from the database
  }

  async create(type: Type): Promise<Type> {
    // Implementation to create a new type in the database
  }

  async update(id: string, type: Type): Promise<Type> {
    // Implementation to update an existing type in the database
  }

  async delete(id: string): Promise<void> {
    // Implementation to delete a type from the database
  }
}