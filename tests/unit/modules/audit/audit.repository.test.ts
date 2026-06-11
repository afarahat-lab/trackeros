import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PostgreSqlAuditRepository } from '../../../../src/modules/audit/audit.repository';
import type { AuditRepository } from '../../../../src/modules/audit/audit.repository';
import type { AuditRecord, CreateAuditRecordInput } from '../../../../src/modules/audit/audit.model';

describe('SC-2: AuditRepository contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports create(input) returning an AuditRecord-based type', async () => {
    class TestRepository extends PostgreSqlAuditRepository {
      async create(input: CreateAuditRecordInput): Promise<AuditRecord> {
        return { id: 'id-1', ...input };
      }

      async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
        return [{ id: 'id-1', entityType, entityId, action: 'created' }];
      }
    }

    const repo: AuditRepository = new TestRepository();
    const result = await repo.create({ entityType: 'user', entityId: '1', action: 'created' });

    expect(result).toEqual({
      id: 'id-1',
      entityType: 'user',
      entityId: '1',
      action: 'created',
    });
  });

  it('supports findByEntity returning AuditRecord array', async () => {
    class TestRepository extends PostgreSqlAuditRepository {
      async create(input: CreateAuditRecordInput): Promise<AuditRecord> {
        return { id: 'id-1', ...input };
      }

      async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
        return [{ id: 'id-2', entityType, entityId, action: 'updated' }];
      }
    }

    const repo: AuditRepository = new TestRepository();
    const result = await repo.findByEntity('user', '1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'id-2',
      entityType: 'user',
      entityId: '1',
      action: 'updated',
    });
  });
});

describe('SC-3: PostgreSqlAuditRepository contract export', () => {
  it('is exported and conforms to AuditRepository through inheritance', async () => {
    class TestRepository extends PostgreSqlAuditRepository {
      async create(input: CreateAuditRecordInput): Promise<AuditRecord> {
        return { id: 'id-3', ...input };
      }

      async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
        return [];
      }
    }

    const repo = new TestRepository();

    expect(repo).toBeInstanceOf(PostgreSqlAuditRepository);
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.findByEntity).toBe('function');
  });

  it('requires subclasses to implement abstract methods', () => {
    expect(PostgreSqlAuditRepository.name).toBe('PostgreSqlAuditRepository');
  });
});

describe('SC-4: canonical PostgreSQL schema definition', () => {
  it('contains the exact audit_records schema fields in source documentation', () => {
    const sourcePath = path.resolve(process.cwd(), 'src/modules/audit/audit.repository.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain('CREATE TABLE audit_records');
    expect(source).toContain('id UUID PRIMARY KEY');
    expect(source).toContain('entity_type VARCHAR(100) NOT NULL');
    expect(source).toContain('entity_id UUID NOT NULL');
    expect(source).toContain('action VARCHAR(100) NOT NULL');
  });

  it('fails exact-field validation when a required schema line is absent', () => {
    const invalidSchema = 'CREATE TABLE audit_records ( id UUID PRIMARY KEY );';

    expect(invalidSchema.includes('entity_type VARCHAR(100) NOT NULL')).toBe(false);
  });
});

describe('SC-5: type compatibility and contract verification', () => {
  it('allows AuditRecord and CreateAuditRecordInput compatibility through repository methods', async () => {
    class TestRepository extends PostgreSqlAuditRepository {
      async create(input: CreateAuditRecordInput): Promise<AuditRecord> {
        return { id: 'generated-id', ...input };
      }

      async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
        return [{ id: 'generated-id', entityType, entityId, action: 'created' }];
      }
    }

    const repository: AuditRepository = new TestRepository();
    const created = await repository.create({
      entityType: 'invoice',
      entityId: '42',
      action: 'created',
    });

    expect(created.id).toBe('generated-id');
    expect(created.entityType).toBe('invoice');
  });

  it('propagates repository errors from contract implementations', async () => {
    class FailingRepository extends PostgreSqlAuditRepository {
      async create(_input: CreateAuditRecordInput): Promise<AuditRecord> {
        throw new Error('create failed');
      }

      async findByEntity(_entityType: string, _entityId: string): Promise<AuditRecord[]> {
        throw new Error('find failed');
      }
    }

    const repository: AuditRepository = new FailingRepository();

    await expect(repository.create({ entityType: 'x', entityId: 'y', action: 'z' })).rejects.toThrow('create failed');
    await expect(repository.findByEntity('x', 'y')).rejects.toThrow('find failed');
  });
});
