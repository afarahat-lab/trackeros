import { describe, it, expect, vi } from 'vitest';
import { Pool } from 'pg';
import config from '../../config';
import pool, { query } from '../index';

vi.mock('pg', () => {
  const mPool = {
    query: vi.fn()
  };
  return { Pool: vi.fn(() => mPool) };
});

vi.mock('../../config', () => ({
  default: {
    databaseUrl: 'postgres://user:password@localhost:5432/testdb'
  }
}));

describe('SC-1: The initial scaffold is set up with all necessary modules and configurations', () => {
  it('should create a new Pool instance with the correct configuration', () => {
    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://user:password@localhost:5432/testdb'
    });
  });

  it('should execute a query and return the result', async () => {
    const mockResult = { rowCount: 1, rows: [{ id: 1 }] };
    const mPool = new Pool();
    mPool.query.mockResolvedValueOnce(mockResult);

    const result = await query('SELECT * FROM users WHERE id = $1', [1]);

    expect(mPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
    expect(result).toEqual(mockResult);
  });

  it('should handle query errors', async () => {
    const mPool = new Pool();
    mPool.query.mockRejectedValueOnce(new Error('Query failed'));

    await expect(query('SELECT * FROM users WHERE id = $1', [1])).rejects.toThrow('Query failed');
  });
});
