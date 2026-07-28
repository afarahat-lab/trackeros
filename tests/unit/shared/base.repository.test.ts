import { KnexBaseRepository, IBaseRepository } from '../../../src/shared/base.repository';

interface TestEntity {
  id: string;
  name: string;
}

class TestRepository extends KnexBaseRepository<TestEntity> {
  constructor(knex: any) {
    super(knex, 'test_table');
  }
}

function createMockQueryBuilder(resolvedData: any) {
  const target: any = {};

  const handler: ProxyHandler<any> = {
    get(_target, prop, _receiver) {
      if (prop === 'then') {
        return (onFulfilled: any) => Promise.resolve(onFulfilled(resolvedData));
      }

      if (!target[prop]) {
        target[prop] = jest.fn(() => proxy);
      }
      return target[prop];
    },
  };

  const proxy = new Proxy(target, handler);
  return proxy;
}

describe('KnexBaseRepository', () => {
  let mockKnex: any;
  let repo: TestRepository;

  beforeEach(() => {
    mockKnex = jest.fn();
    repo = new TestRepository(mockKnex);
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity = { id: '1', name: 'Test' };
      const qb = createMockQueryBuilder(entity);
      mockKnex.mockReturnValue(qb);

      const result = await repo.findById('1');

      expect(mockKnex).toHaveBeenCalledWith('test_table');
      expect(qb.where).toHaveBeenCalledWith({ id: '1' });
      expect(qb.first).toHaveBeenCalled();
      expect(result).toEqual(entity);
    });

    it('should return null when not found', async () => {
      const qb = createMockQueryBuilder(undefined);
      mockKnex.mockReturnValue(qb);

      const result = await repo.findById('2');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all entities without filter', async () => {
      const entities = [{ id: '1', name: 'A' }];
      const qb = createMockQueryBuilder(entities);
      mockKnex.mockReturnValue(qb);

      const result = await repo.findAll();

      expect(mockKnex).toHaveBeenCalledWith('test_table');
      expect(result).toEqual(entities);
    });

    it('should apply filter when provided', async () => {
      const entities = [{ id: '1', name: 'A' }];
      const qb = createMockQueryBuilder(entities);
      mockKnex.mockReturnValue(qb);

      const filter = { name: 'A' };
      const result = await repo.findAll(filter);

      expect(qb.where).toHaveBeenCalledWith(filter);
      expect(result).toEqual(entities);
    });
  });

  describe('create', () => {
    it('should insert and return the created entity', async () => {
      const newEntity = { name: 'New' };
      const created = { id: '1', name: 'New' };
      const qb = createMockQueryBuilder([created]);
      mockKnex.mockReturnValue(qb);

      const result = await repo.create(newEntity);

      expect(qb.insert).toHaveBeenCalledWith(newEntity);
      expect(qb.returning).toHaveBeenCalledWith('*');
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and return the updated entity', async () => {
      const updateData = { name: 'Updated' };
      const updated = { id: '1', name: 'Updated' };
      const qb = createMockQueryBuilder([updated]);
      mockKnex.mockReturnValue(qb);

      const result = await repo.update('1', updateData);

      expect(qb.where).toHaveBeenCalledWith({ id: '1' });
      expect(qb.update).toHaveBeenCalledWith(updateData);
      expect(qb.returning).toHaveBeenCalledWith('*');
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should delete the entity by id', async () => {
      const qb = createMockQueryBuilder(1);
      mockKnex.mockReturnValue(qb);

      await repo.delete('1');

      expect(qb.where).toHaveBeenCalledWith({ id: '1' });
      expect(qb.del).toHaveBeenCalled();
    });
  });
});
