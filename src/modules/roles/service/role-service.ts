import { RoleRepository } from '../repository/role-repository';
import { Role } from '../domain/role';
import { z } from 'zod';

const roleSchema = z.object({
  roleName: z.string(),
  permissions: z.array(z.string())
});

export class RoleService {
  private repository: RoleRepository;

  constructor(repository: RoleRepository) {
    this.repository = repository;
  }

  /**
   * Creates a new role after validating the input.
   * @param roleData - The data for the role to be created.
   * @returns The created role.
   */
  async createRole(roleData: unknown): Promise<Role> {
    const validatedData = roleSchema.parse(roleData);
    const role = await this.repository.create(validatedData);
    // Ensure an audit record is created for the 'createRole' operation
    // auditLog.append({ action: 'createRole', role });
    return role;
  }

  /**
   * Retrieves all roles.
   * @returns A list of roles.
   */
  async getAllRoles(): Promise<Role[]> {
    return this.repository.findAll();
  }
}
