import { ComponentRepository } from '../repository/component-repository';
import { Component } from '../domain/component';

export class ComponentService {
  private repository: ComponentRepository;

  constructor() {
    this.repository = new ComponentRepository();
  }

  async getAllComponents(): Promise<Component[]> {
    return this.repository.getAllComponents();
  }

  async createComponent(component: Component): Promise<string> {
    return this.repository.createComponent(component);
  }
}
