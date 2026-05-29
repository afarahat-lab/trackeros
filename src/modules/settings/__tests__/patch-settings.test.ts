import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import { createServer } from '../../../server';
import { SettingRepository } from '../repository/setting-repository';

// Mock the repository
vi.mock('../repository/setting-repository');

// Integration test for SC-3

describe('SC-3: PATCH /settings updates settings', () => {
  it('should update settings successfully', async () => {
    SettingRepository.prototype.updateSettings = vi.fn().mockResolvedValue();

    const app = await createServer();
    const response = await supertest(app)
      .patch('/api/v1/settings')
      .send({ settings: { key1: 'newValue1' } });

    expect(response.status).toBe(200);
    expect(SettingRepository.prototype.updateSettings).toHaveBeenCalledWith({ key1: 'newValue1' });
  });

  it('should return an error for invalid input', async () => {
    const app = await createServer();
    const response = await supertest(app)
      .patch('/api/v1/settings')
      .send({ invalidKey: 'value' });

    expect(response.status).toBe(400);
  });
});
