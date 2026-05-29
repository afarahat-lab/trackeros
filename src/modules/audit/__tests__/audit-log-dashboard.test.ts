import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app'; // Assuming app is exported from your main server file

// SC-1: A new audit log dashboard module is created under src/modules/audit with a GET /audit/logs endpoint that supports pagination.
describe('SC-1: Audit Log Dashboard Module', () => {
  it('should return paginated audit logs', async () => {
    const response = await request(app)
      .get('/audit/logs')
      .query({ from: '2023-01-01', to: '2023-12-31', limit: 10 })
      .set('Authorization', 'Bearer valid-admin-token');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('logs');
    expect(response.body.logs).toBeInstanceOf(Array);
    expect(response.body.logs.length).toBeLessThanOrEqual(10);
  });

  it('should return a 400 error for invalid query parameters', async () => {
    const response = await request(app)
      .get('/audit/logs')
      .query({ from: 'invalid-date', to: '2023-12-31', limit: 'not-a-number' })
      .set('Authorization', 'Bearer valid-admin-token');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});