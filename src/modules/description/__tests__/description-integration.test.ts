import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from '../../server';

// Integration test for SC-1

describe('SC-1: Description Module Integration Test', () => {
  let app;

  beforeAll(async () => {
    app = await createServer();
  });

  it('should retrieve all descriptions successfully', async () => {
    const response = await request(app).get('/descriptions');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    response.body.forEach(description => {
      expect(description).toHaveProperty('id');
      expect(description).toHaveProperty('title');
      expect(description).toHaveProperty('content');
    });
  });

  it('should return 404 for non-existent route', async () => {
    const response = await request(app).get('/non-existent-route');
    expect(response.status).toBe(404);
  });

  it('should validate description creation input', async () => {
    const response = await request(app)
      .post('/descriptions')
      .send({ title: '', content: '' });
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should create a new description successfully', async () => {
    const newDescription = { title: 'Test Title', content: 'Test Content' };
    const response = await request(app)
      .post('/descriptions')
      .send(newDescription);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(newDescription.title);
    expect(response.body.content).toBe(newDescription.content);
  });
});
