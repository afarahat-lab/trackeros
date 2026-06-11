import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { expectTypeOf } from 'vitest';
import type { AuditRecord, CreateAuditRecordInput } from '../../../../src/modules/audit/audit.model';

describe('SC-1: audit.model contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines AuditRecord with the required fields and types', () => {
    expectTypeOf<AuditRecord>().toMatchTypeOf<{
      id: string;
      entityType: string;
      entityId: string;
      action: string;
    }>();

    const sample: AuditRecord = {
      id: '1',
      entityType: 'user',
      entityId: '123',
      action: 'created',
    };

    expect(sample.id).toBe('1');
    expect(sample.entityType).toBe('user');
    expect(sample.entityId).toBe('123');
    expect(sample.action).toBe('created');
  });

  it('defines CreateAuditRecordInput with the required fields and types', () => {
    expectTypeOf<CreateAuditRecordInput>().toMatchTypeOf<{
      entityType: string;
      entityId: string;
      action: string;
    }>();

    const sample: CreateAuditRecordInput = {
      entityType: 'order',
      entityId: '456',
      action: 'updated',
    };

    expect(sample.entityType).toBe('order');
    expect(sample.entityId).toBe('456');
    expect(sample.action).toBe('updated');
  });

  it('rejects incompatible shapes at the type level', () => {
    type InvalidInput = { entityType: number; entityId: string; action: string };

    expectTypeOf<InvalidInput>().not.toMatchTypeOf<CreateAuditRecordInput>();
    expect(true).toBe(true);
  });
});
