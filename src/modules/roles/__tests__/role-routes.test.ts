import { describe, it, expect, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { roleRoutes } from '../routes/role-routes';

// SC-1: The 'roles' entity is either removed from the domain model or a new module is introduced under src/modules/roles/.
describe('SC-1: RoleRoutes', () => {
  it('should register role routes with Fastify instance', async () => {
    const mockFastify = {
      get: vi.fn(),
      auth: vi.fn(),
      verifyJWT: vi.fn(),
      verifyRoles: vi.fn()
    } as unknown as FastifyInstance;

    await roleRoutes(mockFastify);

    expect(mockFastify.get).toHaveBeenCalled();
  });
});
