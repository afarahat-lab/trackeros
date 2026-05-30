import { Entity } from '../domain/entity';

export interface EntityRepository {
  create(entity: Entity): Promise<void>;
  update(entity: Entity): Promise<void>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Entity | null>;
}

export class PostgresEntityRepository implements EntityRepository {
  async create(entity: Entity): Promise<void> {
    // Implementation for creating an entity in the database
  }

  async update(entity: Entity): Promise<void> {
    // Implementation for updating an entity in the database
  }

  async delete(id: string): Promise<void> {
    // Implementation for deleting an entity from the database
  }

  async findById(id: string): Promise<Entity | null> {
    // Implementation for finding an entity by ID in the database
    return null;
  }
}