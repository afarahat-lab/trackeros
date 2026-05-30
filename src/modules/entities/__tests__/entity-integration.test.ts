import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { entityRoutes } from '../routes/entity-routes';
import { EntityService } from '../service/entity-service';

// Mock the EntityService
const mockEntityService = {
  createEntity: vi.fn(),
  updateEntity: vi.fn(),
  deleteEntity: vi.fn(),
  findById: vi.fn()
};

// Mock Fastify instance
const mockFastify = {
  post: vi.fn(),
  authenticate: vi.fn(),
  authorize: vi.fn()
} as unknown as FastifyInstance;

// Register routes
entityRoutes(mockFastify, mockEntityService as unknown as EntityService);

// Integration test for SC-1

describe('SC-1: Entity module integration tests', () => {
  it('should register POST /entities route', async () => {
    expect(mockFastify.post).toHaveBeenCalledWith(
      '/entities',
      expect.objectContaining({
        preHandler: expect.arrayContaining([mockFastify.authenticate, mockFastify.authorize]),
        schema: expect.any(Object)
      })
    );
  });

  it('should create an entity successfully', async () => {
    const app = mockFastify as unknown as FastifyInstance;
    const response = await request(app)
      .post('/entities')
      .send({ id: '1', name: 'Test Entity', description: 'A test entity' });

    expect(response.status).toBe(200);
    expect(mockEntityService.createEntity).toHaveBeenCalledWith({
      id: '1',
      name: 'Test Entity',
      description: 'A test entity'
    });
  });

  it('should handle errors when creating an entity', async () => {
    mockEntityService.createEntity.mockRejectedValue(new Error('Database error'));
    const app = mockFastify as unknown as FastifyInstance;
    const response = await request(app)
      .post('/entities')
      .send({ id: '1', name: 'Test Entity', description: 'A test entity' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Database error' });
  });
});
