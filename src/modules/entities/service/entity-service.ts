import { Entity } from '../domain/entity';
import { EntityRepository } from '../repository/entity-repository';

export class EntityService {
  constructor(private repository: EntityRepository) {}

  async createEntity(entity: Entity): Promise<void> {
    await this.repository.create(entity);
  }

  async updateEntity(entity: Entity): Promise<void> {
    await this.repository.update(entity);
  }

  async deleteEntity(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async getEntityById(id: string): Promise<Entity | null> {
    return this.repository.findById(id);
  }
}