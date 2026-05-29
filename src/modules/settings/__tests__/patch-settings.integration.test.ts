import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../app';

// Mock the SettingsRepository
vi.mock('../repository/settings-repository', () => {
  return {
    SettingsRepository: class {
      async updateSettings() {
        return;
      }
    }
  };
});

describe('SC-2: PATCH /settings endpoint updates one or more keys successfully', () => {
  it('should update settings successfully', async () => {
    const response = await request(app)
      .patch('/settings')
      .send({ settings: { key1: 'newValue1' } });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Settings updated successfully' });
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(SettingsRepository.prototype.updateSettings).mockRejectedValueOnce(new Error('Database error'));
    const response = await request(app)
      .patch('/settings')
      .send({ settings: { key1: 'newValue1' } });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
  });
});