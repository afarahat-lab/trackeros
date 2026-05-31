import { ComponentsRepository } from '../repository/components-repository';
import { Component } from '../domain/components';

/**
 * Service for handling component business logic.
 */
export class ComponentsService {
  private repository: ComponentsRepository;

  constructor(repository: ComponentsRepository) {
    this.repository = repository;
  }

  /**
   * Retrieves all components.
   */
  async getAllComponents(): Promise<Component[]> {
    return this.repository.getAllComponents();
  }

  /**
   * Creates a new component.
   */
  async createComponent(component: Component): Promise<Component> {
    return this.repository.createComponent(component);
  }
}
