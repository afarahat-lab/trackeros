import { Description } from '../domain/description';
import { db } from '../../shared/db';

export class DescriptionRepository {
  /**
   * Retrieve all descriptions from the database.
   * @returns Promise<Description[]>
   */
  async getAll(): Promise<Description[]> {
    const descriptions = await db.query<Description>('SELECT * FROM descriptions');
    return descriptions.rows;
  }

  /**
   * Create a new description in the database.
   * @param title - The title of the description.
   * @param content - The content of the description.
   * @returns Promise<Description>
   */
  async create(title: string, content: string): Promise<Description> {
    const result = await db.query<Description>(
      'INSERT INTO descriptions (title, content) VALUES ($1, $2) RETURNING *',
      [title, content]
    );
    return result.rows[0];
  }

  /**
   * Update an existing description in the database.
   * @param id - The ID of the description to update.
   * @param title - The new title of the description.
   * @param content - The new content of the description.
   * @returns Promise<Description>
   */
  async update(id: string, title: string, content: string): Promise<Description> {
    const result = await db.query<Description>(
      'UPDATE descriptions SET title = $1, content = $2 WHERE id = $3 RETURNING *',
      [title, content, id]
    );
    return result.rows[0];
  }

  /**
   * Delete a description from the database.
   * @param id - The ID of the description to delete.
   * @returns Promise<void>
   */
  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM descriptions WHERE id = $1', [id]);
  }
}
