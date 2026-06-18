import { BaseRepository, BaseEntity, IRepository } from '../../../src/shared/repositories/base.repository';
import { DatabaseConnection } from '../../../src/shared/database/database.service';

interface TestEntity extends BaseEntity {
  name: string;
  email: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  constructor(db: DatabaseConnection) {
    super(db, 'test_table', 'TestEntity');
  }
}

describe('BaseRepository', () => {
  let mockDb: jest.Mocked<DatabaseConnection>;
  let repo: TestRepository;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      getClient: jest.fn(),
      close: jest.fn(),
    };
    repo = new TestRepository(mockDb);
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const mockEntity: TestEntity = { id: '1', name: 'Test', email: 'test@test.com', created_at: new Date(), updated_at: new Date() };
      mockDb.query.mockResolvedValue({ rows: [mockEntity], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await repo.findById('1');
      expect(result).toEqual(mockEntity);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM test_table WHERE id = $1', ['1']);
    });

    it('should return null when not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const result = await repo.findById('999');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when row deleted', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await repo.delete('1');
      expect(result).toBe(true);
    });

    it('should return false when no row deleted', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const result = await repo.delete('999');
      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all entities without filter', async () => {
      const mockEntities: TestEntity[] = [
        { id: '1', name: 'A', email: 'a@test.com', created_at: new Date(), updated_at: new Date() },
        { id: '2', name: 'B', email: 'b@test.com', created_at: new Date(), updated_at: new Date() },
      ];
      mockDb.query.mockResolvedValue({ rows: mockEntities, rowCount: 2, command: '', oid: 0, fields: [] });

      const result = await repo.findAll();
      expect(result).toEqual(mockEntities);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM test_table', []);
    });

    it('should filter entities when filter provided', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      await repo.findAll({ name: 'A' });
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM test_table WHERE name = $1', ['A']);
    });
  });
});
