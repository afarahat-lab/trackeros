import { Pool } from 'pg';
import { BaseRepository } from '../../../src/shared/base.repository';
import { BaseEntity } from '../../../src/shared/types';

interface TestEntity extends BaseEntity {
  name: string;
  value: number;
}

class TestRepository extends BaseRepository<TestEntity> {
  protected readonly tableName = 'test_table';

  constructor(pool: Pool) {
    super(pool);
  }
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
      const entity: TestEntity = {
        id: '1',
        name: 'test',
        value: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockQuery.mockResolvedValueOnce({ rows: [entity] });

      const result = await repo.findById('1');

      expect(result).toEqual(entity);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE id = $1 AND deleted_at IS NULL',
        ['1'],
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted entities', async () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'a', value: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: '2', name: 'b', value: 2, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ];
      mockQuery.mockResolvedValueOnce({ rows: entities });

      const result = await repo.findAll();

      expect(result).toEqual(entities);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE deleted_at IS NULL',
      );
    });

    it('should return empty array when no entities exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return the new entity', async () => {
      const input = { name: 'new', value: 99 };
      const created: TestEntity = {
        id: 'generated-id',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(input);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('INSERT INTO test_table');
      expect(sql).toContain('RETURNING *');
    });
  });

  describe('update', () => {
    it('should update and return the entity when found', async () => {
      const updates = { value: 100 };
      const updated: TestEntity = {
        id: '1',
        name: 'existing',
        value: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update('1', updates);

      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('UPDATE test_table');
      expect(sql).toContain('SET updated_at = $1');
      expect(sql).toContain('RETURNING *');
    });

    it('should return null when entity not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { value: 100 });

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at and return the entity when found', async () => {
      const deleted: TestEntity = {
        id: '1',
        name: 'to-delete',
        value: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [deleted] });

      const result = await repo.softDelete('1');

      expect(result).toEqual(deleted);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const sql: string = mockQuery.mock.calls[0][0];
      expect(sql).toContain('UPDATE test_table');
      expect(sql).toContain('SET deleted_at = $1');
      expect(sql).toContain('RETURNING *');
    });

    it('should return null when entity not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.softDelete('nonexistent');

      expect(result).toBeNull();
    });
  });
});
