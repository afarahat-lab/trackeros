import { Component } from '../domain/components';
import { Database } from '../../../shared/db/database';

/**
 * Repository for accessing component data.
 */
export class ComponentsRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Retrieves all components.
   */
  async getAllComponents(): Promise<Component[]> {
    const components = await this.db.query<Component>('SELECT * FROM components');
    return components;
  }

  /**
   * Creates a new component.
   */
  async createComponent(component: Component): Promise<Component> {
    const [newComponent] = await this.db.query<Component>(
      'INSERT INTO components (name, description, props, typeId) VALUES ($1, $2, $3, $4) RETURNING *',
      [component.name, component.description, component.props, component.typeId]
    );
    return newComponent;
  }
}
