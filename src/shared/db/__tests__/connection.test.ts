import { describe, it, expect, vi } from 'vitest';
import { Pool } from 'pg';
import pool from '../connection';

vi.mock('pg', () => {
  return {
    Pool: vi.fn(() => ({
      connect: vi.fn(),
      query: vi.fn(),
      end: vi.fn()
    }))
  };
});

describe('SC-5: src/shared/db/connection.ts', () => {
  it('should contain the pg Pool singleton', () => {
    expect(pool).toBeInstanceOf(Pool);
  });
});
