import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { createServer } from 'fastify';
import { registerEntityRoutes } from '../routes/entities-routes';

// Mock the database and audit log to prevent real calls
vi.mock('../../shared/db', () => ({
  db: {
    query: vi.fn().mockResolvedValue({ rows: [{ id: '1', name: 'Test Entity', description: 'A test entity' }] })
  }
}));

vi.mock('../../shared/utils/audit-log', () => ({
  auditLog: vi.fn()
}));

const server = createServer();
registerEntityRoutes(server);

// Integration test for SC-1
// Ensure the entity module is correctly integrated and routes are functioning

describe('SC-1: Entity Module Integration', () => {
  it('should create a new entity successfully', async () => {
    const response = await supertest(server.server)
      .post('/entities')
      .send({ id: '1', name: 'Test Entity', description: 'A test entity' })
      .expect(200);

    expect(response.body).toEqual({ id: '1', name: 'Test Entity', description: 'A test entity' });
  });

  it('should return an error for invalid entity data', async () => {
    const response = await supertest(server.server)
      .post('/entities')
      .send({ id: '1', name: '' }) // Invalid name
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});
