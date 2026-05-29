import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from 'fastify';
import { settingsRoutes } from '../routes/settings-routes';

const app = createServer();
app.register(settingsRoutes);

// Mock authentication and authorization
vi.mock('fastify', () => ({
  auth: () => (req, res, next) => next(),
  verifyJWT: () => (req, res, next) => next(),
  verifyRole: (role) => (req, res, next) => {
    if (role === 'operator') {
      return next();
    }
    res.status(403).send();
  }
}));

describe('SC-4: Access control for settings endpoints', () => {
  it('should allow access to operator role', async () => {
    const response = await request(app).get('/api/v1/settings');
    expect(response.status).toBe(200);
  });

  it('should deny access to non-operator role', async () => {
    vi.mock('fastify', () => ({
      verifyRole: (role) => (req, res, next) => {
        if (role !== 'operator') {
          return res.status(403).send();
        }
        next();
      }
    }));

    const response = await request(app).get('/api/v1/settings');
    expect(response.status).toBe(403);
  });
});
