import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import { FastifyInstance } from 'fastify';
import { descriptionRoutes } from '../routes/description-routes';
import { DescriptionService } from '../service/description-service';

vi.mock('../service/description-service');

const MockDescriptionService = vi.mocked(DescriptionService);

const mockDescriptions = [{ id: '1', title: 'Title 1', content: 'Content 1' }];

MockDescriptionService.prototype.getAllDescriptions.mockResolvedValue(mockDescriptions);

const createFastifyInstance = (): FastifyInstance => {
  const fastify = require('fastify')();
  fastify.register(descriptionRoutes);
  return fastify;
};

describe('SC-1: Description Routes', () => {
  it('should return all descriptions on GET /descriptions', async () => {
    const fastify = createFastifyInstance();

    const response = await supertest(fastify.server).get('/descriptions');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockDescriptions);
  });

  it('should handle errors from the service', async () => {
    MockDescriptionService.prototype.getAllDescriptions.mockRejectedValue(new Error('Service error'));

    const fastify = createFastifyInstance();

    const response = await supertest(fastify.server).get('/descriptions');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Service error');
  });
});
