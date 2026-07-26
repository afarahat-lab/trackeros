
import { Pool } from 'pg';
import { BaseRepository } from '../../../src/shared/base.repository';

interface TestEntity {
  id: string;
  name: string;
  value: number;
}

class TestRepository extends BaseRepository<TestEntity> {
  protected readonly tableName = 'test_table';
}

describe('BaseRepository', () => {
  let repo: TestRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    const pool = { query: mockQuery } as unknown as Pool;
    repo = new TestRepository(pool);
  });

  describe('findById', () => {
    it('should return the entity when found', async () => {
      const entity: TestEntity = { id: '1', name: 'test', value: 42 };
      mockQuery.mockResolvedValueOnce({ rows: [entity] });

      const result = await repo.findById('1');
      expect(result).toEqual(entity);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM "test_table" WHERE id = $1',
        ['1']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'a', value: 1 },
        { id: '2', name: 'b', value: 2 },
      ];
      mockQuery.mockResolvedValueOnce({ rows: entities });

      const result = await repo.findAll();
      expect(result).toEqual(entities);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM "test_table"');
    });

    it('should return empty array when no entities exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('insert', () => {
    it('should insert and return the entity', async () => {
      const entity: TestEntity = { id: '1', name: 'test', value: 42 };
      mockQuery.mockResolvedValueOnce({ rows: [entity] });

      const result = await repo.insert(entity);
      expect(result).toEqual(entity);
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO "test_table" ("id", "name", "value") VALUES ($1, $2, $3) RETURNING *',
        ['1', 'test', 42]
      );
    });
  });

  describe('update', () => {
    it('should update and return the entity when found', async () => {
      const updated: TestEntity = { id: '1', name: 'updated', value: 99 };
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update('1', { name: 'updated', value: 99 });
      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE "test_table" SET "name" = $1, "value" = $2 WHERE id = $3 RETURNING *',
        ['updated', 99, '1']
      );
    });

    it('should return null when entity not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { name: 'nope' });
      expect(result).toBeNull();
    });

    it('should return the existing entity when updates object is empty', async () => {
      const entity: TestEntity = { id: '1', name: 'test', value: 42 };
      mockQuery.mockResolvedValueOnce({ rows: [entity] });

      const result = await repo.update('1', {});
      expect(result).toEqual(entity);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM "test_table" WHERE id = $1',
        ['1']
      );
    });
  });

  describe('delete', () => {
    it('should return true when entity is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.delete('1');
      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM "test_table" WHERE id = $1',
        ['1']
      );
    });

    it('should return false when entity is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false when rowCount is null', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: null });

      const result = await repo.delete('nonexistent');
      expect(result).toBe(false);
    });
  });
});
