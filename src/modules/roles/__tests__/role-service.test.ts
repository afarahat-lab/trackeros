import { describe, it, expect, vi } from 'vitest';
import { RoleService } from '../service/role-service';
import { RoleRepository } from '../repository/role-repository';

// SC-1: The 'roles' entity is either removed from the domain model or a new module is introduced under src/modules/roles/.
describe('SC-1: RoleService', () => {
  it('should create a RoleService instance with a RoleRepository', () => {
    const mockRepository = vi.fn() as unknown as RoleRepository;
    const service = new RoleService(mockRepository);
    expect(service).toBeInstanceOf(RoleService);
  });
});
