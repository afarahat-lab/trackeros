import { Entity } from '../domain/entities';
import { EntitiesRepository } from '../repository/entities-repository';

export class EntitiesService {
  constructor(private repository: EntitiesRepository) {}

  /**
   * Creates a new entity.
   * @param entity The entity to create.
   * @returns The created entity.
   */
  async createEntity(entity: Entity): Promise<Entity> {
    return this.repository.create(entity);
  }

  /**
   * Finds an entity by its ID.
   * @param id The ID of the entity.
   * @returns The entity if found, otherwise null.
   */
  async findEntityById(id: string): Promise<Entity | null> {
    return this.repository.findById(id);
  }

  /**
   * Updates an existing entity.
   * @param entity The entity with updated data.
   * @returns The updated entity.
   */
  async updateEntity(entity: Entity): Promise<Entity> {
    return this.repository.update(entity);
  }

  /**
   * Deletes an entity by its ID.
   * @param id The ID of the entity to delete.
   */
  async deleteEntity(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}