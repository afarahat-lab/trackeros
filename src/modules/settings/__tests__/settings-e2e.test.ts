import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { fastify } from 'fastify';
import { settingsRoutes } from '../routes/settings-routes';

const app = fastify();
settingsRoutes(app);

// Mock the auth middleware
vi.mock('../../shared/auth/auth-middleware', () => {
  return {
    authMiddleware: () => async (request, reply) => {
      if (request.headers['x-role'] !== 'operator') {
        reply.code(403).send({ error: 'Forbidden' });
      }
    }
  };
});

describe('SC-4: Access to the settings endpoints is restricted to users with the operator role', () => {
  it('should allow access for operator role', async () => {
    const response = await request(app.server)
      .get('/api/v1/settings')
      .set('x-role', 'operator');
    expect(response.status).toBe(200);
  });

  it('should deny access for non-operator role', async () => {
    const response = await request(app.server)
      .get('/api/v1/settings')
      .set('x-role', 'user');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });
});
