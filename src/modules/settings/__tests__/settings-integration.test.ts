import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { fastify } from 'fastify';
import { settingsRoutes } from '../routes/settings-routes';

const app = fastify();
settingsRoutes(app);

// Mock the repository
vi.mock('../repository/setting-repository', () => {
  return {
    SettingRepository: class {
      async getAllSettings() {
        return { key1: 'value1', key2: 'value2' };
      }
      async updateSettings(settings) {
        return { ...settings };
      }
    }
  };
});

describe('SC-1: GET /settings endpoint returns the current settings successfully', () => {
  it('should return the current settings', async () => {
    const response = await request(app.server).get('/api/v1/settings');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ key1: 'value1', key2: 'value2' });
  });
});

describe('SC-2: PATCH /settings endpoint updates one or more keys successfully and returns the updated settings', () => {
  it('should update settings and return updated settings', async () => {
    const response = await request(app.server)
      .patch('/api/v1/settings')
      .send({ settings: { key1: 'newValue1' } });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ key1: 'newValue1' });
  });
});
