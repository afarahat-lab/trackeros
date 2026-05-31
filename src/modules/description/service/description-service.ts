import { DescriptionRepository } from '../repository/description-repository';
import { Description } from '../domain/description';

export class DescriptionService {
  constructor(private repository: DescriptionRepository) {}

  /**
   * Create a new description.
   * @param text - The text of the description.
   * @returns The created description.
   */
  async createDescription(text: string): Promise<Description> {
    const description: Omit<Description, 'id'> = {
      text,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.repository.create(description);
  }

  /**
   * Retrieve all descriptions.
   * @returns A list of descriptions.
   */
  async getAllDescriptions(): Promise<Description[]> {
    return this.repository.findAll();
  }

  /**
   * Retrieve a description by ID.
   * @param id - The ID of the description.
   * @returns The description if found, otherwise null.
   */
  async getDescriptionById(id: string): Promise<Description | null> {
    return this.repository.findById(id);
  }

  /**
   * Update a description by ID.
   * @param id - The ID of the description.
   * @param text - The new text of the description.
   * @returns The updated description.
   */
  async updateDescription(id: string, text: string): Promise<Description> {
    return this.repository.update(id, text);
  }

  /**
   * Delete a description by ID.
   * @param id - The ID of the description.
   * @returns True if the description was deleted, otherwise false.
   */
  async deleteDescription(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
