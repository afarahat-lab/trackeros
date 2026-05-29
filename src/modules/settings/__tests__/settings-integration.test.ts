import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from 'fastify';
import { settingsRoutes } from '../routes/settings-routes';

const app = createServer();
app.register(settingsRoutes);

// Mock the database layer
vi.mock('../repository/setting-repository', () => ({
  SettingRepository: class {
    async getAllSettings() {
      return { key1: 'value1', key2: 'value2' };
    }
    async updateSettings(settings) {
      return settings;
    }
  }
}));

vi.mock('../repository/audit-record-repository', () => ({
  AuditRecordRepository: class {
    async append(record) {
      return;
    }
  }
}));

describe('SC-1: Settings Module Endpoints', () => {
  it('should have GET /settings endpoint', async () => {
    const response = await request(app).get('/api/v1/settings');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ key1: 'value1', key2: 'value2' });
  });

  it('should have PATCH /settings endpoint', async () => {
    const response = await request(app)
      .patch('/api/v1/settings')
      .send({ settings: { key1: 'newValue' } });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ key1: 'newValue' });
  });
});

describe('SC-2: PATCH /settings updates and persists changes', () => {
  it('should update settings and persist changes', async () => {
    const response = await request(app)
      .patch('/api/v1/settings')
      .send({ settings: { key1: 'updatedValue' } });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ key1: 'updatedValue' });
  });

  it('should return error for invalid input', async () => {
    const response = await request(app)
      .patch('/api/v1/settings')
      .send({ invalidKey: 'value' });
    expect(response.status).toBe(400);
  });
});
