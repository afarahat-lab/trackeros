import { BaseRepository } from '../../../src/shared/base.repository';
import { Pool } from 'pg';

interface TestEntity {
  id: string;
  name: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  async findById(id: string): Promise<TestEntity | null> {
    const result = await this.pool.query('SELECT * FROM test WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<TestEntity[]> {
    const result = await this.pool.query('SELECT * FROM test');
    return result.rows;
  }

  async create(entity: Partial<TestEntity>): Promise<TestEntity> {
    const result = await this.pool.query(
      'INSERT INTO test (name) VALUES ($1) RETURNING *',
      [entity.name]
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<TestEntity>): Promise<TestEntity> {
    const result = await this.pool.query(
      'UPDATE test SET name = $1 WHERE id = $2 RETURNING *',
      [updates.name, id]
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM test WHERE id = $1', [id]);
  }
}

describe('BaseRepository', () => {
  let mockPool: jest.Mocked<Pool>;
  let repo: TestRepository;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    repo = new TestRepository(mockPool);
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity: TestEntity = { id: '1', name: 'Test' };
      mockPool.query.mockResolvedValueOnce({ rows: [entity] } as never);

      const result = await repo.findById('1');
      expect(result).toEqual(entity);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', ['1']);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ];
      mockPool.query.mockResolvedValueOnce({ rows: entities } as never);

      const result = await repo.findAll();
      expect(result).toEqual(entities);
    });

    it('should return empty array when no entities', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      const result = await repo.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create and return entity', async () => {
      const entity: TestEntity = { id: '1', name: 'New' };
      mockPool.query.mockResolvedValueOnce({ rows: [entity] } as never);

      const result = await repo.create({ name: 'New' });
      expect(result).toEqual(entity);
    });
  });

  describe('update', () => {
    it('should update and return entity', async () => {
      const entity: TestEntity = { id: '1', name: 'Updated' };
      mockPool.query.mockResolvedValueOnce({ rows: [entity] } as never);

      const result = await repo.update('1', { name: 'Updated' });
      expect(result).toEqual(entity);
    });
  });

  describe('delete', () => {
    it('should delete entity', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      await expect(repo.delete('1')).resolves.toBeUndefined();
      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM test WHERE id = $1', ['1']);
    });
  });
});
