
import { Knex } from 'knex';
import { BaseKnexRepository, IBaseRepository } from '../../../src/shared/base.repository';

interface TestEntity {
  id: string;
  name: string;
}

class TestRepository extends BaseKnexRepository<TestEntity> {
  constructor(knex: Knex) {
    super(knex, 'test_table');
  }
}

function createMockKnex(): jest.Mocked<Knex> {
  const queryBuilder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
  };

  const mockKnex = jest.fn(() => queryBuilder) as unknown as jest.Mocked<Knex>;
  (mockKnex as unknown as Record<string, jest.Mock>).where = queryBuilder.where;
  (mockKnex as unknown as Record<string, jest.Mock>).select = queryBuilder.select;
  (mockKnex as unknown as Record<string, jest.Mock>).insert = queryBuilder.insert;
  (mockKnex as unknown as Record<string, jest.Mock>).update = queryBuilder.update;
  (mockKnex as unknown as Record<string, jest.Mock>).del = queryBuilder.del;
  (mockKnex as unknown as Record<string, jest.Mock>).first = queryBuilder.first;
  (mockKnex as unknown as Record<string, jest.Mock>).returning = queryBuilder.returning;

  return mockKnex;
}

describe('IBaseRepository interface', () => {
  it('should define the expected method signatures', () => {
    const repo = {} as IBaseRepository<TestEntity>;
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.findAll).toBe('function');
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.update).toBe('function');
    expect(typeof repo.delete).toBe('function');
  });
});

describe('BaseKnexRepository', () => {
  let mockKnex: jest.Mocked<Knex>;
  let repo: TestRepository;

  beforeEach(() => {
    mockKnex = createMockKnex();
    repo = new TestRepository(mockKnex);
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity: TestEntity = { id: '1', name: 'Test' };
      const chain = mockKnex('test_table') as unknown as Record<string, jest.Mock>;
      chain.first.mockResolvedValue(entity);

      const result = await repo.findById('1');
      expect(result).toEqual(entity);
      expect(chain.where).toHaveBeenCalledWith({ id: '1' });
    });

    it('should return null when not found', async () => {
      const chain = mockKnex('test_table') as unknown as Record<string, jest.Mock>;
      chain.first.mockResolvedValue(undefined);

      const result = await repo.findById('999');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const entities: TestEntity[] = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ];
      const chain = mockKnex('test_table') as unknown as Record<string, jest.Mock>;
      chain.select.mockResolvedValue(entities);

      const result = await repo.findAll();
      expect(result).toEqual(entities);
      expect(chain.select).toHaveBeenCalledWith('*');
    });
  });

  describe('create', () => {
    it('should insert and return the created entity', async () => {
      const input = { name: 'New' };
      const created: TestEntity = { id: '3', name: 'New' };
      const chain = mockKnex('test_table') as unknown as Record<string, jest.Mock>;
      chain.returning.mockResolvedValue([created]);

      const result = await repo.create(input);
      expect(result).toEqual(created);
      expect(chain.insert).toHaveBeenCalledWith(input);
      expect(chain.returning).toHaveBeenCalledWith('*');
    });
  });

  describe('update', () => {
    it('should update and return the updated entity', async () => {
      const patch = { name: 'Updated' };
      const updated: TestEntity = { id: '1', name: 'Updated' };
      const chain = mockKnex('test_table') as unknown as Record<string, jest.Mock>;
      chain.returning.mockResolvedValue([updated]);

      const result = await repo.update('1', patch);
      expect(result).toEqual(updated);
      expect(chain.where).toHaveBeenCalledWith({ id: '1' });
      expect(chain.update).toHaveBeenCalledWith(patch);
    });
  });

  describe('delete', () => {
    it('should delete the entity by id', async () => {
      const chain = mockKnex('test_table') as unknown as Record<string, jest.Mock>;
      chain.del.mockResolvedValue(1);

      await repo.delete('1');
      expect(chain.where).toHaveBeenCalledWith({ id: '1' });
      expect(chain.del).toHaveBeenCalled();
    });
  });
});
