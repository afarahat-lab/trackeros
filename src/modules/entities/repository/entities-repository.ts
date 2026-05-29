import { Entity } from '../domain/entities';

export interface EntitiesRepository {
  create(entity: Entity): Promise<Entity>;
  findById(id: string): Promise<Entity | null>;
  update(entity: Entity): Promise<Entity>;
  delete(id: string): Promise<void>;
}

export class PostgresEntitiesRepository implements EntitiesRepository {
  async create(entity: Entity): Promise<Entity> {
    // Implementation for creating an entity in the database
    return entity;
  }

  async findById(id: string): Promise<Entity | null> {
    // Implementation for finding an entity by ID
    return null;
  }

  async update(entity: Entity): Promise<Entity> {
    // Implementation for updating an entity
    return entity;
  }

  async delete(id: string): Promise<void> {
    // Implementation for deleting an entity
  }
}