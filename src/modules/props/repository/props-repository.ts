import { Props } from '../domain/props';

export class PropsRepository {
  async findAll(): Promise<Props[]> {
    // Implement database logic to retrieve all props
    return [];
  }

  async create(props: Omit<Props, 'id'>): Promise<Props> {
    // Implement database logic to create a new prop
    return { id: 'generated-id', ...props };
  }

  async update(id: string, props: Omit<Props, 'id'>): Promise<Props> {
    // Implement database logic to update an existing prop
    return { id, ...props };
  }

  async delete(id: string): Promise<void> {
    // Implement database logic to delete a prop
  }
}