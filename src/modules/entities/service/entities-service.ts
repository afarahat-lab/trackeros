import { Entity } from '../domain/entities';
import { EntitiesRepository } from '../repository/entities-repository';
import { auditLog } from '../../shared/utils/audit-log';

/**
 * Service for managing entities.
 */
export class EntitiesService {
  private repository: EntitiesRepository;

  constructor() {
    this.repository = new EntitiesRepository();
  }

  /**
   * Creates a new entity and logs the operation.
   * @param entity - The entity to create.
   * @returns The created entity.
   */
  async createEntity(entity: Entity): Promise<Entity> {
    const createdEntity = await this.repository.create(entity);
    await auditLog.append('Entity created', { entityId: createdEntity.id });
    return createdEntity;
  }
}