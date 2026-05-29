import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import { createServer } from '../../../server';
import { authenticate, authorize } from '../../shared/auth/middleware';

// Mock authentication and authorization
vi.mock('../../shared/auth/middleware');

// Integration test for SC-5

describe('SC-5: Access to settings endpoints requires operator role', () => {
  it('should allow access with operator role', async () => {
    authenticate.mockImplementation((req, res, next) => next());
    authorize.mockImplementation((roles) => (req, res, next) => {
      if (roles.includes('operator')) return next();
      res.status(403).send();
    });

    const app = await createServer();
    const response = await supertest(app).get('/api/v1/settings');

    expect(response.status).not.toBe(403);
  });

  it('should deny access without operator role', async () => {
    authenticate.mockImplementation((req, res, next) => next());
    authorize.mockImplementation((roles) => (req, res, next) => {
      res.status(403).send();
    });

    const app = await createServer();
    const response = await supertest(app).get('/api/v1/settings');

    expect(response.status).toBe(403);
  });
});
