import { BaseEntity } from 'modules/BaseEntity/BaseEntity.model';

describe('BaseEntity', () => {
  it('should accept an object with id, createdAt, and updatedAt', () => {
    const now = new Date();
    const entity: BaseEntity = {
      id: 'abc-123',
      createdAt: now,
      updatedAt: now,
    };

    expect(entity.id).toBe('abc-123');
    expect(entity.createdAt).toBe(now);
    expect(entity.updatedAt).toBe(now);
  });

  it('should require id to be a string', () => {
    const now = new Date();
    const entity: BaseEntity = {
      id: 'some-id',
      createdAt: now,
      updatedAt: now,
    };

    expect(typeof entity.id).toBe('string');
  });

  it('should require createdAt and updatedAt to be Date instances', () => {
    const now = new Date();
    const entity: BaseEntity = {
      id: 'test',
      createdAt: now,
      updatedAt: now,
    };

    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
  });
});
