import { Knex } from 'knex';
import { BaseRepository } from '../../../src/shared/base-repository';

interface TestEntity {
  id: string;
  name: string;
  email: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  protected readonly tableName = 'test_table';

  constructor(knex: Knex) {
    super(knex);
  }
}

type QueryBuilderMock = {
  where: jest.Mock;
  first: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  returning: jest.Mock;
};

function createKnexMock(): jest.Mocked<Knex> {
  const qb: QueryBuilderMock = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn(),
    returning: jest.fn(),
  };

  const knexFn = jest.fn().mockReturnValue(qb) as unknown as jest.Mocked<Knex>;

  return knexFn;
}

describe('BaseRepository', () => {
  let knex: jest.Mocked<Knex>;
  let repo: TestRepository;
  let qb: QueryBuilderMock;

  beforeEach(() => {
    knex = createKnexMock();
    repo = new TestRepository(knex);
    qb = (knex as unknown as jest.Mock).mock.results[0]?.value as unknown as QueryBuilderMock;
    // Re-extract after each call since knex() returns the qb
  });

  function getQb(): QueryBuilderMock {
    return (knex as unknown as jest.Mock).mock.results[
      (knex as unknown as jest.Mock).mock.results.length - 1
    ]?.value as unknown as QueryBuilderMock;
  }

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity: TestEntity = { id: '1', name: 'Test', email: 'test@test.com' };
      qb.first.mockResolvedValue(entity);

      const result = await repo.findById('1');

      expect(knex).toHaveBeenCalledWith('test_table');
      expect(qb.where).toHaveBeenCalledWith({ id: '1' });
      expect(qb.first).toHaveBeenCalled();
      expect(result).toEqual(entity);
    });

    it('should return null when not found', async () => {
      qb.first.mockResolvedValue(undefined);

      const result = await repo.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities when no filter', async () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'A', email: 'a@test.com' },
        { id: '2', name: 'B', email: 'b@test.com' },
      ];
      // findAll returns the query directly, so the qb itself is the return value
      qb.where.mockReturnValue(entities as unknown as ReturnType<QueryBuilderMock['where']>);

      const result = await repo.findAll();

      expect(knex).toHaveBeenCalledWith('test_table');
      expect(result).toEqual(entities);
    });

    it('should apply filter when provided', async () => {
      const entities: TestEntity[] = [{ id: '1', name: 'A', email: 'a@test.com' }];
      qb.where.mockReturnValue(entities as unknown as ReturnType<QueryBuilderMock['where']>);

      const result = await repo.findAll({ name: 'A' });

      expect(knex).toHaveBeenCalledWith('test_table');
      expect(qb.where).toHaveBeenCalledWith({ name: 'A' });
      expect(result).toEqual(entities);
    });
  });

  describe('create', () => {
    it('should insert and return the created entity', async () => {
      const data: Partial<TestEntity> = { name: 'New', email: 'new@test.com' };
      const created: TestEntity = { id: '3', name: 'New', email: 'new@test.com' };
      qb.returning.mockResolvedValue([created]);

      const result = await repo.create(data);

      expect(knex).toHaveBeenCalledWith('test_table');
      expect(qb.insert).toHaveBeenCalledWith(data);
      expect(qb.returning).toHaveBeenCalledWith('*');
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and return the updated entity', async () => {
      const data: Partial<TestEntity> = { name: 'Updated' };
      const updated: TestEntity = { id: '1', name: 'Updated', email: 'test@test.com' };
      qb.returning.mockResolvedValue([updated]);

      const result = await repo.update('1', data);

      expect(knex).toHaveBeenCalledWith('test_table');
      expect(qb.where).toHaveBeenCalledWith({ id: '1' });
      expect(qb.update).toHaveBeenCalledWith(data);
      expect(qb.returning).toHaveBeenCalledWith('*');
      expect(result).toEqual(updated);
    });

    it('should return null when entity not found', async () => {
      qb.returning.mockResolvedValue([]);

      const result = await repo.update('999', { name: 'Nope' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when entity deleted', async () => {
      qb.delete.mockResolvedValue(1);

      const result = await repo.delete('1');

      expect(knex).toHaveBeenCalledWith('test_table');
      expect(qb.where).toHaveBeenCalledWith({ id: '1' });
      expect(qb.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when entity not found', async () => {
      qb.delete.mockResolvedValue(0);

      const result = await repo.delete('999');

      expect(result).toBe(false);
    });
  });
});
