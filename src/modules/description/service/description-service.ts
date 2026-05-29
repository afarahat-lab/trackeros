import { Description } from '../domain/description';
import { DescriptionRepository } from '../repository/description-repository';

export class DescriptionService {
  constructor(private repository: DescriptionRepository) {}

  async getAllDescriptions(): Promise<Description[]> {
    return this.repository.getAll();
  }

  async createDescription(title: string, content: string): Promise<Description> {
    return this.repository.create({ title, content });
  }
}
