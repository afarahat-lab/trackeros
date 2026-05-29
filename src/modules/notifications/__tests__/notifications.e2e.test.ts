import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../app'; // Assuming app is exported from a central location

// E2E tests for SC-4

describe('Notifications Module E2E Tests', () => {
  describe('SC-4: Access control for notifications endpoints', () => {
    it('should allow access to POST /notifications for operator role', async () => {
      const response = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer operator-token') // Mocked operator token
        .send({
          userId: 'user123',
          title: 'Operator Test',
          body: 'Operator test body',
          channel: 'email',
          scheduledFor: new Date().toISOString()
        });
      expect(response.status).toBe(201);
    });

    it('should deny access to POST /notifications for non-operator role', async () => {
      const response = await request(app)
        .post('/notifications')
        .set('Authorization', 'Bearer non-operator-token') // Mocked non-operator token
        .send({
          userId: 'user123',
          title: 'Non-Operator Test',
          body: 'Non-Operator test body',
          channel: 'email',
          scheduledFor: new Date().toISOString()
        });
      expect(response.status).toBe(403);
    });
  });
});