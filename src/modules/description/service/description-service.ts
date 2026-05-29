import { DescriptionRepository } from '../repository/description-repository';
import { Description } from '../domain/description';

/**
 * Service for handling business logic related to Descriptions.
 */
export class DescriptionService {
  private repository: DescriptionRepository;

  constructor() {
    this.repository = new DescriptionRepository();
  }

  /**
   * Retrieves all descriptions.
   */
  async getAllDescriptions(): Promise<Description[]> {
    return this.repository.getAll();
  }

  /**
   * Creates a new description.
   */
  async createDescription(description: Omit<Description, 'id'>): Promise<Description> {
    return this.repository.create(description);
  }

  /**
   * Updates an existing description.
   */
  async updateDescription(id: string, description: Omit<Description, 'id'>): Promise<Description> {
    return this.repository.update(id, description);
  }

  /**
   * Deletes a description.
   */
  async deleteDescription(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}