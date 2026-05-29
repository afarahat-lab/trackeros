import { Entity } from '../domain/entities';
import { db } from '../../shared/db';

/**
 * Repository for accessing entity data.
 */
export class EntitiesRepository {
  /**
   * Creates a new entity in the database.
   * @param entity - The entity to create.
   * @returns The created entity.
   */
  async create(entity: Entity): Promise<Entity> {
    const result = await db.query('INSERT INTO entities (id, name, description) VALUES ($1, $2, $3) RETURNING *', [entity.id, entity.name, entity.description]);
    return result.rows[0];
  }
}