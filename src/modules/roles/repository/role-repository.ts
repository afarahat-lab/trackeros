import { Role } from '../domain/role';

export class RoleRepository {
  async create(role: Omit<Role, 'id'>): Promise<Role> {
    // Implement database logic to insert a new role and return the created role with an id
    throw new Error('Not implemented');
  }

  async findAll(): Promise<Role[]> {
    // Implement database logic to retrieve all roles
    throw new Error('Not implemented');
  }
}
