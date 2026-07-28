import { BaseRepository } from '../../../src/shared/base.repository';

// Concrete implementation for testing
interface TestEntity {
  id: string;
  name: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  async findById(id: string): Promise<TestEntity | null> {
    return { id, name: 'test' };
  }
  async findAll(): Promise<TestEntity[]> {
    return [];
  }
  async create(entity: Partial<TestEntity>): Promise<TestEntity> {
    return { id: '1', name: entity.name ?? 'default' };
  }
  async update(id: string, updates: Partial<TestEntity>): Promise<TestEntity> {
    return { id, name: updates.name ?? 'updated' };
  }
  async delete(_id: string): Promise<void> {
    // no-op
  }
}

describe('BaseRepository', () => {
  it('should be abstract and not instantiable directly', () => {
    // @ts-expect-error - cannot instantiate abstract class
    expect(() => new BaseRepository()).toThrow();
  });

  it('should allow concrete subclass to use db property', () => {
    const repo = new TestRepository();
    expect(repo).toHaveProperty('db');
  });

  it('concrete subclass should implement all abstract methods', async () => {
    const repo = new TestRepository();
    const entity = await repo.findById('1');
    expect(entity).toEqual({ id: '1', name: 'test' });
  });
});
