import { RoleRepository } from '../repository/role-repository';
import { Role } from '../domain/role';

export class RoleService {
  private roleRepository: RoleRepository;

  constructor(roleRepository: RoleRepository) {
    this.roleRepository = roleRepository;
  }

  /**
   * Retrieves all roles.
   * @returns Promise<Role[]>
   */
  async getRoles(): Promise<Role[]> {
    return this.roleRepository.getAllRoles();
  }

  /**
   * Creates a new role.
   * @param roleName - The name of the role.
   * @param permissions - The permissions associated with the role.
   * @returns Promise<string> - The ID of the newly created role.
   */
  async createRole(roleName: string, permissions: string[]): Promise<string> {
    return this.roleRepository.createRole(roleName, permissions);
  }

  /**
   * Updates an existing role.
   * @param roleId - The ID of the role to update.
   * @param roleName - The new name of the role.
   * @param permissions - The new permissions for the role.
   * @returns Promise<boolean> - Whether the update was successful.
   */
  async updateRole(roleId: string, roleName: string, permissions: string[]): Promise<boolean> {
    return this.roleRepository.updateRole(roleId, roleName, permissions);
  }

  /**
   * Deletes a role.
   * @param roleId - The ID of the role to delete.
   * @returns Promise<boolean> - Whether the deletion was successful.
   */
  async deleteRole(roleId: string): Promise<boolean> {
    return this.roleRepository.deleteRole(roleId);
  }
}