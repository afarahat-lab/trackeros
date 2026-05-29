import { describe, it, expect, vi } from 'vitest';
import { buildFastify } from '../../../api';
import { DescriptionService } from '../service/description-service';
import { DescriptionRepositoryImpl } from '../repository/description-repository';
import supertest from 'supertest';

const fastify = buildFastify();
const repository = new DescriptionRepositoryImpl();
const service = new DescriptionService(repository);

fastify.register((instance, opts, done) => {
  descriptionRoutes(instance, service);
  done();
});

const request = supertest(fastify.server);

describe('SC-1: The description entity is either removed or a new module is introduced', () => {
  it('should return an empty array when no descriptions exist', async () => {
    vi.spyOn(repository, 'getAll').mockResolvedValueOnce([]);
    const response = await request.get('/api/v1/descriptions');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should return descriptions when they exist', async () => {
    const mockDescriptions = [
      { id: '1', title: 'Test Title', content: 'Test Content' }
    ];
    vi.spyOn(repository, 'getAll').mockResolvedValueOnce(mockDescriptions);
    const response = await request.get('/api/v1/descriptions');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockDescriptions);
  });

  it('should handle errors gracefully', async () => {
    vi.spyOn(repository, 'getAll').mockRejectedValueOnce(new Error('Database error'));
    const response = await request.get('/api/v1/descriptions');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
  });
});
