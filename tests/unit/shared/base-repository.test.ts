import { BaseRepository } from '../../../src/shared/base-repository';

jest.mock('../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../src/shared/db/connection';

class TestRepository extends BaseRepository {}

type TestRow = Record<string, unknown> & {
  id: number;
  name: string;
  email: string;
};

describe('BaseRepository', () => {
  let repo: TestRepository;
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    repo = new TestRepository();
    mockQuery.mockReset();
  });

  describe('query', () => {
    it('should execute a query and return the result', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
      mockQuery.mockResolvedValueOnce(mockResult);

      const result = await repo.query<TestRow>('SELECT * FROM test WHERE id = $1', [1]);

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [1]);
      expect(result).toBe(mockResult);
    });

    it('should propagate errors from the pool', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.query('SELECT 1')).rejects.toThrow('connection refused');
    });
  });

  describe('findById', () => {
    it('should return a row when found', async () => {
      const row: TestRow = { id: 1, name: 'Alice', email: 'alice@example.com' };
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById<TestRow>('employees', 1);

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees WHERE id = $1', [1]);
      expect(result).toEqual(row);
    });

    it('should return null when no row is found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findById<TestRow>('employees', 999);

      expect(result).toBeNull();
    });

    it('should propagate errors from the pool', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findById<TestRow>('employees', 1)).rejects.toThrow('query failed');
    });
  });

  describe('findAll', () => {
    it('should return all rows from a table', async () => {
      const rows: TestRow[] = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 2 });

      const result = await repo.findAll<TestRow>('employees');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM employees', undefined);
      expect(result).toEqual(rows);
    });

    it('should return an empty array when table is empty', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findAll<TestRow>('employees');

      expect(result).toEqual([]);
    });

    it('should propagate errors from the pool', async () => {
      mockQuery.mockRejectedValueOnce(new Error('table does not exist'));

      await expect(repo.findAll<TestRow>('nonexistent')).rejects.toThrow('table does not exist');
    });
  });

  describe('insert', () => {
    it('should insert a row and return it', async () => {
      const data = { name: 'Charlie', email: 'charlie@example.com' };
      const inserted: TestRow = { id: 3, ...data };
      mockQuery.mockResolvedValueOnce({ rows: [inserted], rowCount: 1 });

      const result = await repo.insert<TestRow>('employees', data);

      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO employees (name, email) VALUES ($1, $2) RETURNING *',
        ['Charlie', 'charlie@example.com']
      );
      expect(result).toEqual(inserted);
    });

    it('should propagate constraint violation errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

      await expect(
        repo.insert<TestRow>('employees', { name: 'Dup', email: 'dup@example.com' })
      ).rejects.toThrow('duplicate key value violates unique constraint');
    });
  });

  describe('update', () => {
    it('should update a row and return the updated row', async () => {
      const data = { name: 'Alice Updated' };
      const updated: TestRow = { id: 1, name: 'Alice Updated', email: 'alice@example.com' };
      mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

      const result = await repo.update<TestRow>('employees', 1, data);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE employees SET name = $1 WHERE id = $2 RETURNING *',
        ['Alice Updated', 1]
      );
      expect(result).toEqual(updated);
    });

    it('should return null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.update<TestRow>('employees', 999, { name: 'Nobody' });

      expect(result).toBeNull();
    });

    it('should propagate errors from the pool', async () => {
      mockQuery.mockRejectedValueOnce(new Error('update failed'));

      await expect(
        repo.update<TestRow>('employees', 1, { name: 'X' })
      ).rejects.toThrow('update failed');
    });
  });

  describe('delete', () => {
    it('should delete a row and return true when a row was removed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await repo.delete('employees', 1);

      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM employees WHERE id = $1', [1]);
      expect(result).toBe(true);
    });

    it('should return false when no row was removed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.delete('employees', 999);

      expect(result).toBe(false);
    });

    it('should propagate errors from the pool', async () => {
      mockQuery.mockRejectedValueOnce(new Error('delete failed'));

      await expect(repo.delete('employees', 1)).rejects.toThrow('delete failed');
    });
  });
});
