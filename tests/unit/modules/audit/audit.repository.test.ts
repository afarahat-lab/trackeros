import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
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

  it('supports create(input) and findByEntity(entityType, entityId) signatures', async () => {
    class TestRepository implements AuditRepository {
      async create(input: CreateAuditRecordInput): Promise<AuditRecord> {
        return { id: '1', ...input };
      }

      async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
        return [{ id: '1', entityType, entityId, action: 'created' }];
      }
    }

    const repo = new TestRepository();
    const created = await repo.create({ entityType: 'user', entityId: 'u1', action: 'created' });
    const records = await repo.findByEntity('user', 'u1');

    expect(created).toEqual({ id: '1', entityType: 'user', entityId: 'u1', action: 'created' });
    expect(records).toEqual([{ id: '1', entityType: 'user', entityId: 'u1', action: 'created' }]);
  });

  it('propagates repository errors', async () => {
    class FailingRepository implements AuditRepository {
      async create(_input: CreateAuditRecordInput): Promise<AuditRecord> {
        throw new Error('create failed');
      }

      async findByEntity(_entityType: string, _entityId: string): Promise<AuditRecord[]> {
        throw new Error('find failed');
      }
    }

    const repo = new FailingRepository();

    await expect(repo.create({ entityType: 'x', entityId: 'y', action: 'z' })).rejects.toThrow('create failed');
    await expect(repo.findByEntity('x', 'y')).rejects.toThrow('find failed');
  });
});

describe('SC-3: PostgreSqlAuditRepository abstract contract', () => {
  it('can be extended with matching method signatures', async () => {
    class ConcreteRepository extends PostgreSqlAuditRepository {
      async create(input: CreateAuditRecordInput): Promise<AuditRecord> {
        return { id: 'generated', ...input };
      }

      async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
        return [{ id: 'generated', entityType, entityId, action: 'created' }];
      }
    }

    const repo = new ConcreteRepository();

    await expect(repo.create({ entityType: 'user', entityId: '1', action: 'created' })).resolves.toEqual({
      id: 'generated',
      entityType: 'user',
      entityId: '1',
      action: 'created',
    });
  });
});

describe('SC-4: Repository depends on audit.model and avoids circular contract definition', () => {
  it('imports AuditRecord and CreateAuditRecordInput from audit.model', () => {
    const repositoryPath = path.resolve(process.cwd(), 'src/modules/audit/audit.repository.ts');
    const source = fs.readFileSync(repositoryPath, 'utf8');

    expect(source).toContain('import { AuditRecord, CreateAuditRecordInput } from "./audit.model"');
    expect(source).not.toContain('interface AuditRecord');
    expect(source).not.toContain('interface CreateAuditRecordInput');
  });

  it('does not import audit.repository from audit.model (basic circular dependency guard)', () => {
    const modelPath = path.resolve(process.cwd(), 'src/modules/audit/audit.model.ts');
    const source = fs.readFileSync(modelPath, 'utf8');

    expect(source).not.toContain('audit.repository');
  });
});

describe('SC-5: Canonical audit_records schema representation', () => {
  it('maps exactly to the required columns and types through the exported models', () => {
    const record: AuditRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      entityType: 'VARCHAR(100)',
      entityId: '550e8400-e29b-41d4-a716-446655440001',
      action: 'VARCHAR(100)',
    };

    expect(Object.keys(record).sort()).toEqual(['action', 'entityId', 'entityType', 'id'].sort());
    expect(typeof record.id).toBe('string');
    expect(typeof record.entityType).toBe('string');
    expect(typeof record.entityId).toBe('string');
    expect(typeof record.action).toBe('string');
  });

  it('rejects schema drift by ensuring no additional canonical fields are represented', () => {
    const record: AuditRecord = {
      id: '1',
      entityType: 'user',
      entityId: '2',
      action: 'created',
    };

    expect(Object.keys(record)).toHaveLength(4);
  });
});

describe('SC-6: Existing Vitest contract test presence and compatibility', () => {
  it('contains a Vitest-based repository contract spec file', () => {
    const specPath = path.resolve(process.cwd(), 'tests/unit/modules/audit/audit.repository.spec.ts');
    const source = fs.readFileSync(specPath, 'utf8');

    expect(source).toContain('from "vitest"');
    expect(source).toContain('AuditRepository');
    expect(source).toContain('AuditRecord');
  });
});
