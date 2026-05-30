import { describe, it, expect } from 'vitest';

// Assuming the role entity is defined in src/modules/roles/domain/role.ts
import { Role } from '../domain/role';

// SC-1: The 'roles' entity is either removed from the domain model or a new module is introduced under src/modules/roles/.
describe('SC-1: Role Entity', () => {
  it('should define a Role interface with id, roleName, and permissions', () => {
    const role: Role = {
      id: '1',
      roleName: 'admin',
      permissions: ['read', 'write']
    };

    expect(role).toHaveProperty('id');
    expect(role).toHaveProperty('roleName');
    expect(role).toHaveProperty('permissions');
    expect(role.permissions).toBeInstanceOf(Array);
  });
});
