import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import { buildFastify } from '../../shared/utils/build-fastify';
import { db } from '../../shared/db';

vi.mock('../../shared/db', () => ({
  db: {
    query: vi.fn()
  }
}));

const app = buildFastify();

app.register(require('../routes/entities-routes'));

const request = supertest(app.server);

describe('SC-1: Integration test for entities module', () => {
  it('should create an entity successfully', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: '1', name: 'Test Entity', description: 'A test entity' }]
    });

    const response = await request.post('/entities').send({
      name: 'Test Entity',
      description: 'A test entity'
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: '1',
      name: 'Test Entity',
      description: 'A test entity'
    });
  });

  it('should return an error if entity creation fails', async () => {
    db.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request.post('/entities').send({
      name: 'Test Entity',
      description: 'A test entity'
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Internal Server Error'
    });
  });

  it('should update documentation if entities module is introduced or removed', () => {
    // This test is more of a manual check to ensure documentation is updated.
    // In a real-world scenario, this could involve checking the existence of certain keywords or sections in the documentation files.
    const domainDoc = require('fs').readFileSync('docs/DOMAIN.md', 'utf-8');
    const architectureDoc = require('fs').readFileSync('docs/ARCHITECTURE.md', 'utf-8');

    expect(domainDoc).toContain('entities');
    expect(architectureDoc).toContain('entities');
  });
});
