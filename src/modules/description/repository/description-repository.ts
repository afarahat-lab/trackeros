import { Description } from '../domain/description';
import { db } from '../../shared/db';

/**
 * Repository for accessing Description data.
 */
export class DescriptionRepository {
  /**
   * Retrieves all descriptions from the database.
   */
  async getAll(): Promise<Description[]> {
    return db.query('SELECT * FROM descriptions');
  }

  /**
   * Creates a new description in the database.
   */
  async create(description: Omit<Description, 'id'>): Promise<Description> {
    const result = await db.query(
      'INSERT INTO descriptions (title, content) VALUES ($1, $2) RETURNING *',
      [description.title, description.content]
    );
    return result.rows[0];
  }

  /**
   * Updates an existing description in the database.
   */
  async update(id: string, description: Omit<Description, 'id'>): Promise<Description> {
    const result = await db.query(
      'UPDATE descriptions SET title = $1, content = $2 WHERE id = $3 RETURNING *',
      [description.title, description.content, id]
    );
    return result.rows[0];
  }

  /**
   * Deletes a description from the database.
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.query('DELETE FROM descriptions WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}