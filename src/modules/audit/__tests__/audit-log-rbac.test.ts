import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app'; // Assuming app is exported from your main server file

// SC-3: RBAC is enforced on the GET /audit/logs endpoint, requiring an admin role.
describe('SC-3: RBAC Enforcement on Audit Logs', () => {
  it('should allow access to admin users', async () => {
    const response = await request(app)
      .get('/audit/logs')
      .query({ from: '2023-01-01', to: '2023-12-31', limit: 10 })
      .set('Authorization', 'Bearer valid-admin-token');

    expect(response.status).toBe(200);
  });

  it('should deny access to non-admin users', async () => {
    const response = await request(app)
      .get('/audit/logs')
      .query({ from: '2023-01-01', to: '2023-12-31', limit: 10 })
      .set('Authorization', 'Bearer valid-user-token');

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
  });

  it('should deny access without a token', async () => {
    const response = await request(app)
      .get('/audit/logs')
      .query({ from: '2023-01-01', to: '2023-12-31', limit: 10 });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});