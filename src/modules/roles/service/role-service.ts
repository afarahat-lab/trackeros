import { Role } from '../domain/role';
import { RoleRepository } from '../repository/role-repository';

export class RoleService {
  private roleRepository: RoleRepository;

  constructor(roleRepository: RoleRepository) {
    this.roleRepository = roleRepository;
  }

  /**
   * Retrieves all roles.
   * @returns Promise<Role[]>
   */
  async getAllRoles(): Promise<Role[]> {
    return this.roleRepository.getAllRoles();
  }

  /**
   * Creates a new role.
   * @param role Role to be created
   * @returns Promise<Role>
   */
  async createRole(role: Role): Promise<Role> {
    return this.roleRepository.createRole(role);
  }
}
