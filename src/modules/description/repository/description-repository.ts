import { Description } from '../domain/description';

export interface DescriptionRepository {
  create(description: Omit<Description, 'id'>): Promise<Description>;
  findAll(): Promise<Description[]>;
  findById(id: string): Promise<Description | null>;
  update(id: string, text: string): Promise<Description>;
  delete(id: string): Promise<boolean>;
}
