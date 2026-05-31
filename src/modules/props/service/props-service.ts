import { PropsRepository } from '../repository/props-repository';
import { Props } from '../domain/props';

export class PropsService {
  private repository: PropsRepository;

  constructor() {
    this.repository = new PropsRepository();
  }

  async getAllProps(): Promise<Props[]> {
    return this.repository.findAll();
  }

  async createProp(name: string, value: string): Promise<Props> {
    return this.repository.create({ name, value });
  }

  async updateProp(id: string, name: string, value: string): Promise<Props> {
    return this.repository.update(id, { name, value });
  }

  async deleteProp(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}