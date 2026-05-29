import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import fastify from 'fastify';
import { registerRoutes } from '../../api';
import { verifyRoles } from '../../shared/auth/rbac-middleware';

vi.mock('../../shared/auth/rbac-middleware', () => ({
  verifyRoles: vi.fn()
}));

const app = fastify();
registerRoutes(app);

const request = supertest(app.server);

describe('SC-1: A GET request to /hello returns a JSON response with {message:"hello"}', () => {
  it('should return a 200 status and {message: "hello"} when user has correct role', async () => {
    verifyRoles.mockImplementation(() => async (req, reply) => {
      req.user = { roles: ['admin'] };
    });

    const response = await request.get('/api/v1/hello');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'hello' });
  });

  it('should return a 403 status when user does not have the correct role', async () => {
    verifyRoles.mockImplementation(() => async (req, reply) => {
      req.user = { roles: ['user'] };
      reply.status(403).send({ error: 'Forbidden' });
    });

    const response = await request.get('/api/v1/hello');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });
});
