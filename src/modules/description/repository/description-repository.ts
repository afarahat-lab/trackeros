import { Description } from '../domain/description';

export interface DescriptionRepository {
  getAll(): Promise<Description[]>;
  create(description: Omit<Description, 'id'>): Promise<Description>;
}

export class DescriptionRepositoryImpl implements DescriptionRepository {
  async getAll(): Promise<Description[]> {
    // Implementation for fetching all descriptions from the database
    return [];
  }

  async create(description: Omit<Description, 'id'>): Promise<Description> {
    // Implementation for creating a new description in the database
    return { id: 'generated-id', ...description };
  }
}
