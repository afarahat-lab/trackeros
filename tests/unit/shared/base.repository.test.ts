import { BaseRepository, BaseEntity } from '../../../src/shared/db/base.repository';
import { Pool } from 'pg';

interface TestEntity extends BaseEntity {
  name: string;
  email: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  protected readonly tableName = 'test_entities';
}

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
    })),
  };
});

describe('BaseRepository', () => {
  let repo: TestRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository();
    mockQuery = (repo as unknown as { pool: { query: jest.Mock } }).pool.query as jest.Mock;
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity: TestEntity = {
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [entity] });

      const result = await repo.findById('1');

      expect(result).toEqual(entity);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE id = $1',
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
    it('should return all entities when no filters', async () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'A', email: 'a@example.com', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'B', email: 'b@example.com', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockQuery.mockResolvedValueOnce({ rows: entities });

      const result = await repo.findAll();

      expect(result).toEqual(entities);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM test_entities');
    });

    it('should filter entities when filters provided', async () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'A', email: 'a@example.com', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockQuery.mockResolvedValueOnce({ rows: entities });

      const result = await repo.findAll({ name: 'A' });

      expect(result).toEqual(entities);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE name = $1',
        ['A'],
      );
    });

    it('should handle multiple filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findAll({ name: 'A', email: 'a@example.com' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE name = $1 AND email = $2',
        ['A', 'a@example.com'],
      );
    });
  });

  describe('create', () => {
    it('should insert entity and return it', async () => {
      const input = { name: 'New', email: 'new@example.com' };
      const created: TestEntity = {
        id: '3',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [created] });

      const result = await repo.create(input);

      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO test_entities (name, email, created_at, updated_at)\n       VALUES ($1, $2, NOW(), NOW())\n       RETURNING *',
        ['New', 'new@example.com'],
      );
    });
  });

  describe('update', () => {
    it('should update entity and return it', async () => {
      const updated: TestEntity = {
        id: '1',
        name: 'Updated',
        email: 'updated@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [updated] });

      const result = await repo.update('1', { name: 'Updated' });

      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE test_entities\n       SET name = $1, updated_at = NOW()\n       WHERE id = $2\n       RETURNING *',
        ['Updated', '1'],
      );
    });

    it('should return null when entity not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { name: 'X' });

      expect(result).toBeNull();
    });

    it('should return existing entity when no updates provided', async () => {
      const existing: TestEntity = {
        id: '1',
        name: 'Existing',
        email: 'e@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [existing] });

      const result = await repo.update('1', {});

      expect(result).toEqual(existing);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE id = $1',
        ['1'],
      );
    });
  });

  describe('delete', () => {
    it('should return true when row deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.delete('1');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM test_entities WHERE id = $1',
        ['1'],
      );
    });

    it('should return false when no row deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
