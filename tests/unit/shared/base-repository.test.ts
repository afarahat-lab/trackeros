
import { IBaseRepository } from '../../../src/shared/base-repository';

interface TestEntity {
  id: string;
  name: string;
}

class TestRepository implements IBaseRepository<TestEntity> {
  private items: TestEntity[] = [];

  async findById(id: string): Promise<TestEntity | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findAll(): Promise<TestEntity[]> {
    return [...this.items];
  }

  async create(entity: Omit<TestEntity, 'id'>): Promise<TestEntity> {
    const created: TestEntity = { id: 'generated-id', ...entity };
    this.items.push(created);
    return created;
  }

  async update(id: string, entity: Partial<TestEntity>): Promise<TestEntity | null> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...entity };
    return this.items[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}

describe('IBaseRepository<T>', () => {
  let repo: TestRepository;

  beforeEach(() => {
    repo = new TestRepository();
  });

  it('should create an entity and return it with an id', async () => {
    const result = await repo.create({ name: 'test' });
    expect(result.id).toBeDefined();
    expect(result.name).toBe('test');
  });

  it('should find an entity by id', async () => {
    const created = await repo.create({ name: 'find-me' });
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('find-me');
  });

  it('should return null when findById does not match', async () => {
    const found = await repo.findById('nonexistent');
    expect(found).toBeNull();
  });

  it('should find all entities', async () => {
    await repo.create({ name: 'a' });
    await repo.create({ name: 'b' });
    const all = await repo.findAll();
    expect(all.length).toBe(2);
  });

  it('should update an entity', async () => {
    const created = await repo.create({ name: 'old' });
    const updated = await repo.update(created.id, { name: 'new' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('new');
  });

  it('should return null when updating a nonexistent entity', async () => {
    const updated = await repo.update('nonexistent', { name: 'x' });
    expect(updated).toBeNull();
  });

  it('should delete an entity and return true', async () => {
    const created = await repo.create({ name: 'delete-me' });
    const deleted = await repo.delete(created.id);
    expect(deleted).toBe(true);
    expect(await repo.findById(created.id)).toBeNull();
  });

  it('should return false when deleting a nonexistent entity', async () => {
    const deleted = await repo.delete('nonexistent');
    expect(deleted).toBe(false);
  });
});
