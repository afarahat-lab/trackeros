import { Type } from '../domain/type';
import { TypeRepository } from '../repository/type-repository';

export class TypeService {
  private repository: TypeRepository;

  constructor() {
    this.repository = new TypeRepository();
  }

  async getAllTypes(): Promise<Type[]> {
    return this.repository.findAll();
  }

  async createType(type: Type): Promise<Type> {
    return this.repository.create(type);
  }

  async updateType(id: string, type: Type): Promise<Type> {
    return this.repository.update(id, type);
  }

  async deleteType(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}