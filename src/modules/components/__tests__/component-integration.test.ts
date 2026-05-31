import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { componentRoutes } from '../routes/component-routes';
import { ComponentService } from '../service/component-service';

vi.mock('../service/component-service');

let app: FastifyInstance;

beforeAll(async () => {
  app = FastifyInstance();
  app.register(componentRoutes);
});

afterAll(async () => {
  await app.close();
});

describe('SC-1: Integration of components module', () => {
  it('should return all components successfully', async () => {
    const mockComponents = [
      { componentName: 'Button', props: {} },
      { componentName: 'Input', props: {} }
    ];
    ComponentService.prototype.getAllComponents = vi.fn().mockResolvedValue(mockComponents);

    const response = await request(app).get('/components');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockComponents);
  });

  it('should handle error when retrieving components', async () => {
    ComponentService.prototype.getAllComponents = vi.fn().mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/components');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal Server Error');
  });

  it('should create a new component successfully', async () => {
    const newComponent = { componentName: 'Checkbox', props: {} };
    ComponentService.prototype.createComponent = vi.fn().mockResolvedValue('new-component-id');

    const response = await request(app)
      .post('/components')
      .send(newComponent);

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('new-component-id');
  });

  it('should handle error when creating a component', async () => {
    const newComponent = { componentName: 'Checkbox', props: {} };
    ComponentService.prototype.createComponent = vi.fn().mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/components')
      .send(newComponent);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal Server Error');
  });
});
