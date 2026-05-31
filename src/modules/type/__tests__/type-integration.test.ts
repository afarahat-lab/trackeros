import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { fastify } from 'fastify';
import { typeRoutes } from '../routes/type-routes';

// Mocking the TypeService
vi.mock('../service/type-service', () => {
  return {
    TypeService: class {
      async getAllTypes() {
        return [{ id: '1', name: 'Type1' }];
      }
      async createType(type) {
        return { id: '2', ...type };
      }
      async updateType(id, type) {
        return { id, ...type };
      }
      async deleteType(id) {
        return;
      }
    }
  };
});

describe('SC-1: Integration tests for type module', () => {
  let app;

  beforeAll(async () => {
    app = fastify();
    app.register(typeRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should fetch all types', async () => {
    const response = await request(app.server).get('/api/v1/types');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: '1', name: 'Type1' }]);
  });

  it('should create a new type', async () => {
    const newType = { name: 'Type2' };
    const response = await request(app.server).post('/api/v1/types').send(newType);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: '2', name: 'Type2' });
  });

  it('should update an existing type', async () => {
    const updatedType = { name: 'UpdatedType' };
    const response = await request(app.server).put('/api/v1/types/1').send(updatedType);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: '1', name: 'UpdatedType' });
  });

  it('should delete a type', async () => {
    const response = await request(app.server).delete('/api/v1/types/1');
    expect(response.status).toBe(204);
  });

  it('should return 404 for non-existing type', async () => {
    const response = await request(app.server).get('/api/v1/types/999');
    expect(response.status).toBe(404);
  });
});
