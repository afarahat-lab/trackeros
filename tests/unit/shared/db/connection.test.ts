import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import pool from '../../../src/shared/db/connection';

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }))
}));

describe('SC-5: src/shared/db/connection.ts', () => {
  it('should create a pg Pool singleton', () => {
    expect(Pool).toHaveBeenCalledTimes(1);
    expect(pool).toBeInstanceOf(Pool);
  });

  it('should configure pool with correct connection string and SSL settings', () => {
    const poolInstance = Pool.mock.instances[0];
    const config = Pool.mock.calls[0][0];
    expect(config.connectionString).toBe(process.env.DATABASE_URL);
    expect(config.ssl).toEqual(process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false);
  });
});
