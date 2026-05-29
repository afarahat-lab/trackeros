import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app'; // Assuming app is the Fastify instance

describe('SC-1: Leave Request Module Endpoints', () => {
  it('should have POST /leave-requests endpoint', async () => {
    const response = await request(app).post('/leave-requests').send({});
    expect(response.status).not.toBe(404);
  });

  it('should have GET /leave-requests endpoint', async () => {
    const response = await request(app).get('/leave-requests');
    expect(response.status).not.toBe(404);
  });
});