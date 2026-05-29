import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import { build } from '../../../api';

const app = build();

// Mock external dependencies
vi.mock('../repository/role-repository', () => {
  return {
    RoleRepository: class {
      async getAllRoles() {
        return [
          { roleId: '1', roleName: 'Admin', permissions: ['read', 'write'] },
          { roleId: '2', roleName: 'User', permissions: ['read'] }
        ];
      }
      async createRole(roleName, permissions) {
        return '3';
      }
    }
  };
});

vi.mock('../../../shared/utils/audit-log', () => {
  return {
    auditLog: vi.fn()
  };
});


describe('SC-1: The roles entity is either fully integrated with a new module or removed from the domain model', () => {
  it('should retrieve all roles successfully', async () => {
    const response = await supertest(app).get('/api/v1/roles').set('Authorization', 'Bearer test-token');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([
      { roleId: '1', roleName: 'Admin', permissions: ['read', 'write'] },
      { roleId: '2', roleName: 'User', permissions: ['read'] }
    ]);
  });

  it('should handle error when retrieving roles', async () => {
    vi.mocked(app.inject).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const response = await supertest(app).get('/api/v1/roles').set('Authorization', 'Bearer test-token');
    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal Server Error');
  });

  it('should create a new role successfully', async () => {
    const response = await supertest(app).post('/api/v1/roles').send({
      roleName: 'Test Role',
      permissions: ['read', 'write']
    }).set('Authorization', 'Bearer test-token');

    expect(response.statusCode).toBe(200);
    expect(response.body.roleId).toBe('3');
  });

  it('should handle error when creating a new role', async () => {
    vi.mocked(app.inject).mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const response = await supertest(app).post('/api/v1/roles').send({
      roleName: 'Test Role',
      permissions: ['read', 'write']
    }).set('Authorization', 'Bearer test-token');

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal Server Error');
  });
});
