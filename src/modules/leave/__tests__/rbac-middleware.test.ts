import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { rbacMiddleware } from '../../shared/auth/rbac-middleware';

vi.mock('../../shared/auth/rbac-middleware');

describe('SC-5: Role-Based Access Control', () => {
  it('should enforce RBAC on POST /leave-requests', async () => {
    await request(app).post('/leave-requests').send({});
    expect(rbacMiddleware).toHaveBeenCalled();
  });

  it('should enforce RBAC on GET /leave-requests', async () => {
    await request(app).get('/leave-requests');
    expect(rbacMiddleware).toHaveBeenCalled();
  });
});