import { BaseRepository } from '../../src/shared/base.repository';
import { pool } from '../../src/shared/db/connection';

jest.mock('../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

interface TestEntity {
  id: string;
  name: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  protected getTableName(): string {
    return 'test_table';
  }
}

describe('BaseRepository', () => {
  let repo: TestRepository;

  beforeEach(() => {
    repo = new TestRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity: TestEntity = { id: '1', name: 'test' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [entity] });
      const result = await repo.findById('1');
      expect(result).toEqual(entity);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE id = $1',
        ['1']
      );
    });

    it('should return null when not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await repo.findById('999');
      expect(result).toBeNull();
    });

    it('should throw on database error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.findById('1')).rejects.toThrow('Failed to find entity by id: DB error');
    });
  });

  describe('findAll', () => {
    it('should return all entities without filters', async () => {
      const entities: TestEntity[] = [{ id: '1', name: 'a' }, { id: '2', name: 'b' }];
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: entities });
      const result = await repo.findAll();
      expect(result).toEqual(entities);
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM test_table', []);
    });

    it('should apply filters', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      await repo.findAll({ name: 'test' });
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE name = $1',
        ['test']
      );
    });

    it('should throw on database error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.findAll()).rejects.toThrow('Failed to find entities: DB error');
    });
  });

  describe('create', () => {
    it('should insert and return entity', async () => {
      const entity: TestEntity = { id: '1', name: 'new' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [entity] });
      const result = await repo.create({ name: 'new' });
      expect(result).toEqual(entity);
    });

    it('should throw on database error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.create({ name: 'x' })).rejects.toThrow('Failed to create entity: DB error');
    });
  });

  describe('update', () => {
    it('should update and return entity', async () => {
      const entity: TestEntity = { id: '1', name: 'updated' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [entity] });
      const result = await repo.update('1', { name: 'updated' });
      expect(result).toEqual(entity);
    });

    it('should throw when entity not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      await expect(repo.update('999', { name: 'x' })).rejects.toThrow('Failed to update entity: Entity with id 999 not found');
    });

    it('should throw on database error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.update('1', { name: 'x' })).rejects.toThrow('Failed to update entity: DB error');
    });
  });

  describe('delete', () => {
    it('should delete entity', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      await expect(repo.delete('1')).resolves.toBeUndefined();
      expect(pool.query).toHaveBeenCalledWith('DELETE FROM test_table WHERE id = $1', ['1']);
    });

    it('should throw on database error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.delete('1')).rejects.toThrow('Failed to delete entity: DB error');
    });
  });
});
