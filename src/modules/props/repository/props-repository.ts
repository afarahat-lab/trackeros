import { Props } from '../domain/props';
import { db } from '../../shared/db';

/**
 * Repository for accessing props data.
 */
export class PropsRepository {
  /**
   * Retrieves all props from the database.
   * @returns {Promise<Props[]>} A promise that resolves to an array of props.
   */
  async getAll(): Promise<Props[]> {
    const result = await db.query<Props>('SELECT name, value FROM props');
    return result.rows;
  }

  /**
   * Creates a new prop in the database.
   * @param {Props} prop - The prop to create.
   * @returns {Promise<Props>} A promise that resolves to the created prop.
   */
  async create(prop: Props): Promise<Props> {
    const result = await db.query<Props>(
      'INSERT INTO props (name, value) VALUES ($1, $2) RETURNING name, value',
      [prop.name, prop.value]
    );
    return result.rows[0];
  }
}
