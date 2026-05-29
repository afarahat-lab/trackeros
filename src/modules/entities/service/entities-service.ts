import { EntitiesRepository } from '../repository/entities-repository';
import { Entity } from '../domain/entity';

export class EntitiesService {
  private repository: EntitiesRepository;

  constructor(repository: EntitiesRepository) {
    this.repository = repository;
  }

  /**
   * Create a new entity.
   * @param entity - The entity to create.
   * @returns The created entity.
   */
  async createEntity(entity: Omit<Entity, 'id'>): Promise<Entity> {
    return this.repository.create(entity);
  }

  /**
   * Retrieve all entities.
   * @returns A list of entities.
   */
  async getAllEntities(): Promise<Entity[]> {
    return this.repository.findAll();
  }
}
