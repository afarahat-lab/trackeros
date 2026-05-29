import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../app'; // Assuming app is exported from a central location

// Integration tests for SC-1 and SC-2

describe('Notifications Module Integration Tests', () => {
  describe('SC-1: Endpoints existence', () => {
    it('should have POST /notifications endpoint', async () => {
      const response = await request(app).post('/notifications').send({});
      expect(response.status).not.toBe(404);
    });

    it('should have GET /notifications endpoint', async () => {
      const response = await request(app).get('/notifications');
      expect(response.status).not.toBe(404);
    });
  });

  describe('SC-2: Notifications persistence', () => {
    it('should persist a notification via POST /notifications', async () => {
      const notificationData = {
        userId: 'user123',
        title: 'Test Notification',
        body: 'This is a test notification.',
        channel: 'email',
        scheduledFor: new Date().toISOString()
      };

      const postResponse = await request(app).post('/notifications').send(notificationData);
      expect(postResponse.status).toBe(201);
      expect(postResponse.body).toHaveProperty('id');

      const getResponse = await request(app).get('/notifications');
      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user123',
            title: 'Test Notification'
          })
        ])
      );
    });
  });
});