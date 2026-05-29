import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import { createServer } from '../../../server';
import { SettingRepository } from '../repository/setting-repository';

// Mock the repository
vi.mock('../repository/setting-repository');

// Integration test for SC-2

describe('SC-2: GET /settings returns the current settings', () => {
  it('should return the current settings', async () => {
    const mockSettings = { key1: 'value1', key2: 'value2' };
    SettingRepository.prototype.getAllSettings = vi.fn().mockResolvedValue(mockSettings);

    const app = await createServer();
    const response = await supertest(app).get('/api/v1/settings');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockSettings);
  });
});
