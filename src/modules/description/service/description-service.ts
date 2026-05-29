import { DescriptionRepository } from '../repository/description-repository';
import { Description } from '../domain/description';

export class DescriptionService {
  private repository: DescriptionRepository;

  constructor(repository: DescriptionRepository) {
    this.repository = repository;
  }

  /**
   * Get all descriptions.
   * @returns Promise<Description[]>
   */
  async getAllDescriptions(): Promise<Description[]> {
    return this.repository.getAll();
  }

  /**
   * Create a new description.
   * @param title - The title of the description.
   * @param content - The content of the description.
   * @returns Promise<Description>
   */
  async createDescription(title: string, content: string): Promise<Description> {
    return this.repository.create(title, content);
  }

  /**
   * Update an existing description.
   * @param id - The ID of the description to update.
   * @param title - The new title of the description.
   * @param content - The new content of the description.
   * @returns Promise<Description>
   */
  async updateDescription(id: string, title: string, content: string): Promise<Description> {
    return this.repository.update(id, title, content);
  }

  /**
   * Delete a description.
   * @param id - The ID of the description to delete.
   * @returns Promise<void>
   */
  async deleteDescription(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
