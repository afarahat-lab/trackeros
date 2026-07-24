
import { Pool } from 'pg';
import { BaseRepository } from '../../../src/shared/base-repository';

interface TestEntity {
  id: string;
  name: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  async findById(id: string): Promise<TestEntity | null> {
    const result = await this.query('SELECT * FROM test WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }
}

describe('BaseRepository', () => {
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;
  });

  describe('constructor', () => {
    it('should use the provided pool', () => {
      const repo = new TestRepository(mockPool);
      expect(repo['pool']).toBe(mockPool);
    });
  });

  describe('query', () => {
    it('should delegate to pool.query with text and params', async () => {
      const mockResult = { rows: [{ id: '1', name: 'test' }], rowCount: 1 };
      mockPool.query.mockResolvedValueOnce(mockResult);

      const repo = new TestRepository(mockPool);
      const result = await repo['query']('SELECT $1', ['hello']);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT $1', ['hello']);
      expect(result).toBe(mockResult);
    });

    it('should propagate pool errors', async () => {
      const dbError = new Error('connection refused');
      mockPool.query.mockRejectedValueOnce(dbError);

      const repo = new TestRepository(mockPool);

      await expect(repo['query']('SELECT 1')).rejects.toThrow('connection refused');
    });
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity = { id: '42', name: 'answer' };
      mockPool.query.mockResolvedValueOnce({ rows: [entity], rowCount: 1 });

      const repo = new TestRepository(mockPool);
      const result = await repo.findById('42');

      expect(result).toEqual(entity);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM test WHERE id = $1',
        ['42'],
      );
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const repo = new TestRepository(mockPool);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
