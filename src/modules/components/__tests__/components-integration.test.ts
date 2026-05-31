import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import { FastifyInstance } from 'fastify';
import { ComponentsService } from '../service/components-service';
import { ComponentsRepository } from '../repository/components-repository';
import { Database } from '../../../shared/db/database';
import { Component } from '../domain/components';
import { componentSchema } from '../routes/components-routes';

vi.mock('../repository/components-repository');
vi.mock('../../../shared/db/database');

const mockComponents: Component[] = [
  { id: '1', name: 'Component1', props: {}, typeId: 'type1' },
  { id: '2', name: 'Component2', props: {}, typeId: 'type2' }
];

const mockDb = new Database();
const mockRepository = new ComponentsRepository(mockDb);
const mockService = new ComponentsService(mockRepository);

vi.spyOn(mockRepository, 'getAllComponents').mockResolvedValue(mockComponents);

async function setupServer(): Promise<FastifyInstance> {
  const fastify = require('fastify')();
  fastify.get('/components', async (request, reply) => {
    const components = await mockService.getAllComponents();
    reply.send(components);
  });
  return fastify;
}

describe('SC-1: Integration test for components module', () => {
  it('should retrieve all components successfully', async () => {
    const server = await setupServer();
    const response = await supertest(server.server).get('/components');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockComponents);
  });

  it('should handle errors when retrieving components', async () => {
    vi.spyOn(mockRepository, 'getAllComponents').mockRejectedValue(new Error('Database error'));
    const server = await setupServer();
    const response = await supertest(server.server).get('/components');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message', 'Internal Server Error');
  });
});
