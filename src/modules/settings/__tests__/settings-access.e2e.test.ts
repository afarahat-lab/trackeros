import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../app';

// Mock the authorize middleware
vi.mock('../../shared/auth/authorize', () => {
  return {
    authorize: (roles: string[]) => {
      return async (req, res, next) => {
        if (roles.includes('operator')) {
          return next();
        }
        res.status(403).send({ error: 'Forbidden' });
      };
    }
  };
});

describe('SC-4: Access to /settings endpoints is restricted to users with the operator role', () => {
  it('should allow access for users with operator role', async () => {
    const response = await request(app)
      .get('/settings')
      .set('Authorization', 'Bearer valid-operator-token');
    expect(response.status).toBe(200);
  });

  it('should deny access for users without operator role', async () => {
    const response = await request(app)
      .get('/settings')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });
});