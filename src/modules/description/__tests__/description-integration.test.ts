import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from 'fastify';
import { descriptionRoutes } from '../routes/description-routes';

// Mock the database and other external dependencies
vi.mock('../../shared/db', () => ({
  db: {
    query: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../shared/utils/audit-log', () => ({
  auditLog: vi.fn(),
}));

// Integration test for SC-1
describe('SC-1: Description Module Integration Test', () => {
  let server;

  beforeAll(async () => {
    server = createServer();
    await server.register(descriptionRoutes);
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 200 and an empty array when no descriptions exist', async () => {
    const response = await request(server.server).get('/api/v1/descriptions');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(db.query).mockRejectedValueOnce(new Error('Database error'));
    const response = await request(server.server).get('/api/v1/descriptions');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
  });
});
