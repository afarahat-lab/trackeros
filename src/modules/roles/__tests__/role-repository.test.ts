import { describe, it, expect, vi } from 'vitest';
import { RoleRepository } from '../repository/role-repository';

// SC-1: The 'roles' entity is either removed from the domain model or a new module is introduced under src/modules/roles/.
describe('SC-1: RoleRepository', () => {
  it('should throw an error when create is not implemented', async () => {
    const repository = new RoleRepository();
    await expect(repository.create({ roleName: 'admin', permissions: ['read'] })).rejects.toThrow('Not implemented');
  });

  it('should throw an error when findAll is not implemented', async () => {
    const repository = new RoleRepository();
    await expect(repository.findAll()).rejects.toThrow('Not implemented');
  });
});
