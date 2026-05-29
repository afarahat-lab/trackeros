import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app';

describe('SC-3: List and Filter Leave Requests', () => {
  it('should list all leave requests', async () => {
    const response = await request(app).get('/leave-requests');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should filter leave requests by status', async () => {
    const response = await request(app).get('/leave-requests?status=pending');
    expect(response.status).toBe(200);
    response.body.forEach(request => {
      expect(request.status).toBe('pending');
    });
  });
});