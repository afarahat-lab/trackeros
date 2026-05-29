import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../app'; // Assuming app is exported from your main server file

// Mock the SettingsRepository
vi.mock('../repository/settings-repository', () => {
  return {
    SettingsRepository: class {
      async getSettings() {
        return { key1: 'value1', key2: 'value2' };
      }
    }
  };
});

describe('SC-1: GET /settings endpoint returns the current settings successfully', () => {
  it('should return the current settings', async () => {
    const response = await request(app).get('/settings');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ key1: 'value1', key2: 'value2' });
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(SettingsRepository.prototype.getSettings).mockRejectedValueOnce(new Error('Database error'));
    const response = await request(app).get('/settings');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
  });
});