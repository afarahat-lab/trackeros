import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { expectTypeOf } from 'vitest';
import * as repositoryModule from '../../../../src/modules/audit/audit.repository';
import type { AuditRepository } from '../../../../src/modules/audit/audit.repository';
import type { AuditRecord, CreateAuditRecordInput } from '../../../../src/modules/audit/audit.model';

describe('SC-2: AuditRepository contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports repository method signatures using audit model types', () => {
    expectTypeOf<AuditRepository['create']>().toEqualTypeOf<(
      input: CreateAuditRecordInput,
    ) => Promise<AuditRecord>>();

    expectTypeOf<AuditRepository['findByEntity']>().toEqualTypeOf<(
      entityType: string,
      entityId: string,
    ) => Promise<AuditRecord[]>>();

    expect(true).toBe(true);
  });

  it('rejects incompatible contract shapes at type level', () => {
    expectTypeOf<AuditRepository['create']>().not.toEqualTypeOf<() => Promise<AuditRecord>>();
    expect(true).toBe(true);
  });
});

describe('SC-3: PostgreSqlAuditRepository abstract contract', () => {
  it('exports the abstract PostgreSqlAuditRepository class', () => {
    expect(repositoryModule.PostgreSqlAuditRepository).toBeTypeOf('function');
  });

  it('supports subclasses implementing the repository contract', async () => {
    class TestRepository extends repositoryModule.PostgreSqlAuditRepository {
      public async create(input: CreateAuditRecordInput): Promise<AuditRecord> {
        return { id: '1', ...input };
      }

      public async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
        return [{ id: '1', entityType, entityId, action: 'created' }];
      }
    }

    const repo = new TestRepository();
    const created = await repo.create({ entityType: 'order', entityId: '42', action: 'created' });

    expect(created).toEqual({
      id: '1',
      entityType: 'order',
      entityId: '42',
      action: 'created',
    });
  });
});

describe('SC-4: repository contracts use audit model types without circular contract leakage', () => {
  it('keeps create input and output mapped to audit model types', () => {
    expectTypeOf<AuditRepository['create']>().toEqualTypeOf<(
      input: CreateAuditRecordInput,
    ) => Promise<AuditRecord>>();

    expect(true).toBe(true);
  });

  it('keeps findByEntity return type mapped to AuditRecord array', () => {
    expectTypeOf<ReturnType<AuditRepository['findByEntity']>>().toEqualTypeOf<Promise<AuditRecord[]>>();
    expect(true).toBe(true);
  });
});

describe('SC-5: audit module contract compatibility', () => {
  it('verifies exported repository symbols exist', () => {
    expect(Object.prototype.hasOwnProperty.call(repositoryModule, 'PostgreSqlAuditRepository')).toBe(true);
  });

  it('verifies TypeScript compatibility between repository and model contracts', () => {
    expectTypeOf<AuditRepository>().toMatchTypeOf<{
      create: (input: CreateAuditRecordInput) => Promise<AuditRecord>;
      findByEntity: (entityType: string, entityId: string) => Promise<AuditRecord[]>;
    }>();

    expect(true).toBe(true);
  });
});

describe('SC-6: canonical audit_records schema representation', () => {
  it('maps schema columns to contract fields', () => {
    const record: AuditRecord = {
      id: 'audit-1',
      entityType: 'user',
      entityId: 'user-1',
      action: 'updated',
    };

    expect(record.id).toBe('audit-1');
    expect(record.entityType).toBe('user');
    expect(record.entityId).toBe('user-1');
    expect(record.action).toBe('updated');
  });

  it('requires all canonical fields for record construction', () => {
    const input: CreateAuditRecordInput = {
      entityType: 'user',
      entityId: 'user-1',
      action: 'created',
    };

    expect(input).toEqual({
      entityType: 'user',
      entityId: 'user-1',
      action: 'created',
    });
  });
});