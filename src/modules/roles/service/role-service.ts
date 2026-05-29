import { Role } from '../domain/role';
import { RoleRepository } from '../repository/role-repository';

export class RoleService {
  private roleRepository: RoleRepository;

  constructor(roleRepository: RoleRepository) {
    this.roleRepository = roleRepository;
  }

  async getAllRoles(): Promise<Role[]> {
    return this.roleRepository.getAllRoles();
  }

  async createRole(role: Role): Promise<Role> {
    return this.roleRepository.createRole(role);
  }

  async updateRole(role: Role): Promise<Role> {
    return this.roleRepository.updateRole(role);
  }

  async deleteRole(roleId: string): Promise<void> {
    return this.roleRepository.deleteRole(roleId);
  }
}