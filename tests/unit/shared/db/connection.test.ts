import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import pool from '../../../../src/shared/db/connection';
import { Pool } from 'pg';

jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('SC-5: src/shared/db/connection.ts', () => {
  it('should create a pg Pool singleton', () => {
    expect(Pool).toHaveBeenCalledTimes(1);
    expect(pool).toBeInstanceOf(Pool);
  });
});
