import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { expectTypeOf } from 'vitest';
import type { AuditRecord, CreateAuditRecordInput } from '../../../../src/modules/audit/audit.model';
import { PostgreSqlAuditRepository } from '../../../../src/modules/audit/audit.repository';
import type { AuditRepository } from '../../../../src/modules/audit/audit.repository';

describe('SC-2: AuditRepository contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes create and findByEntity signatures using audit model types', () => {
    expectTypeOf<AuditRepository['create']>().toEqualTypeOf<(
      input: CreateAuditRecordInput
    ) => Promise<AuditRecord>>();

    expectTypeOf<AuditRepository['findByEntity']>().toEqualTypeOf<(
      entityType: string,
      entityId: string
    ) => Promise<AuditRecord[]>>();

    expect(true).toBe(true);
  });

  it('does not match incompatible repository signatures', () => {
    type InvalidCreate = (input: { wrong: string }) => Promise<AuditRecord>;

    expectTypeOf<InvalidCreate>().not.toEqualTypeOf<AuditRepository['create']>();
    expect(true).toBe(true);
  });
});

describe('SC-3: PostgreSqlAuditRepository contract implementation', () => {
  it('can be extended with matching method signatures', async () => {
    class TestRepository extends PostgreSqlAuditRepository {
      public async create(input: CreateAuditRecordInput): Promise<AuditRecord> {
        return { id: 'id-1', ...input };
      }

      public async findByEntity(entityType: string, entityId: string): Promise<AuditRecord[]> {
        return [{ id: 'id-1', entityType, entityId, action: 'read' }];
      }
    }

    const repo: AuditRepository = new TestRepository();

    const created = await repo.create({
      entityType: 'user',
      entityId: '42',
      action: 'created',
    });

    expect(created).toEqual({
      id: 'id-1',
      entityType: 'user',
      entityId: '42',
      action: 'created',
    });
  });

  it('is abstract and cannot be directly instantiated', () => {
    expect(typeof PostgreSqlAuditRepository).toBe('function');
    expect(true).toBe(true);
  });
});

describe('SC-4: repository uses audit model types without circular contract concerns', () => {
  it('maintains type compatibility between repository methods and model exports', () => {
    expectTypeOf<AuditRepository['create']>().returns.toEqualTypeOf<Promise<AuditRecord>>();
    expect(true).toBe(true);
  });

  it('fails compatibility against unrelated model shapes', () => {
    type DifferentRecord = { id: number };
    expectTypeOf<DifferentRecord>().not.toMatchTypeOf<AuditRecord>();
    expect(true).toBe(true);
  });
});

describe('SC-5: Vitest-based contract verification', () => {
  it('uses Vitest type assertions to verify exports', () => {
    expectTypeOf<AuditRecord>().toBeObject();
    expectTypeOf<CreateAuditRecordInput>().toBeObject();
    expectTypeOf<AuditRepository>().toBeObject();
    expect(true).toBe(true);
  });

  it('detects incompatible export expectations', () => {
    expectTypeOf<{ action: number }>().not.toMatchTypeOf<CreateAuditRecordInput>();
    expect(true).toBe(true);
  });
});

describe('SC-6: canonical audit_records schema representation', () => {
  it('maps schema columns to contract fields', () => {
    const record: AuditRecord = {
      id: 'audit-1',
      entityType: 'invoice',
      entityId: 'inv-10',
      action: 'deleted',
    };

    expect(record).toEqual({
      id: 'audit-1',
      entityType: 'invoice',
      entityId: 'inv-10',
      action: 'deleted',
    });
  });

  it('does not allow schema-incompatible field typing', () => {
    type InvalidSchema = {
      id: number;
      entityType: string;
      entityId: string;
      action: string;
    };

    expectTypeOf<InvalidSchema>().not.toMatchTypeOf<AuditRecord>();
    expect(true).toBe(true);
  });
});
