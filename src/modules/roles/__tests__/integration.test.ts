import { describe, it, expect } from 'vitest';
import { Role } from '../domain/role';
import { RoleRepository } from '../repository/role-repository';
import { RoleService } from '../service/role-service';
import { roleRoutes } from '../routes/role-routes';
import Fastify from 'fastify';
import supertest from 'supertest';

// Mocking the RoleRepository
vi.mock('../repository/role-repository', () => {
  return {
    RoleRepository: vi.fn().mockImplementation(() => {
      return {
        getAllRoles: vi.fn().mockResolvedValue([{ roleName: 'admin', permissions: ['read', 'write'] }]),
        createRole: vi.fn().mockResolvedValue({ roleName: 'user', permissions: ['read'] })
      };
    })
  };
});

const fastify = Fastify();
const roleRepository = new RoleRepository();
const roleService = new RoleService(roleRepository);
roleRoutes(fastify, roleService);

// Integration test for SC-1

describe('SC-1: Roles Module Integration Test', () => {
  it('should return all roles successfully', async () => {
    const response = await supertest(fastify.server).get('/roles');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ roleName: 'admin', permissions: ['read', 'write'] }]);
  });

  it('should create a new role successfully', async () => {
    const newRole: Role = { roleName: 'user', permissions: ['read'] };
    const response = await supertest(fastify.server).post('/roles').send(newRole);
    expect(response.status).toBe(201);
    expect(response.body).toEqual(newRole);
  });

  it('should handle errors when retrieving roles', async () => {
    vi.spyOn(roleRepository, 'getAllRoles').mockRejectedValue(new Error('Database error'));
    const response = await supertest(fastify.server).get('/roles');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Database error');
  });

  it('should handle errors when creating a role', async () => {
    const newRole: Role = { roleName: 'user', permissions: ['read'] };
    vi.spyOn(roleRepository, 'createRole').mockRejectedValue(new Error('Database error'));
    const response = await supertest(fastify.server).post('/roles').send(newRole);
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Database error');
  });
});
