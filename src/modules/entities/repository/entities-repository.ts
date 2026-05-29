import { db } from '../../shared/db';
import { Entity } from '../domain/entity';

export class EntitiesRepository {
  /**
   * Create a new entity in the database.
   * @param entity - The entity to create.
   * @returns The created entity.
   */
  async create(entity: Omit<Entity, 'id'>): Promise<Entity> {
    const result = await db.query(
      'INSERT INTO entities (name, description) VALUES ($1, $2) RETURNING *',
      [entity.name, entity.description]
    );
    return result.rows[0];
  }

  /**
   * Retrieve all entities from the database.
   * @returns A list of entities.
   */
  async findAll(): Promise<Entity[]> {
    const result = await db.query('SELECT * FROM entities');
    return result.rows;
  }
}
