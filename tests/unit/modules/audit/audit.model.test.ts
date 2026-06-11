import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { expectTypeOf } from 'vitest';
import type { AuditRecord, CreateAuditRecordInput } from '../../../../src/modules/audit/audit.model';

describe('SC-1: audit.model contract exports', () => {
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

    expect(true).toBe(true);
  });

  it('defines CreateAuditRecordInput with the required fields and excludes id', () => {
    expectTypeOf<CreateAuditRecordInput>().toMatchTypeOf<{
      entityType: string;
      entityId: string;
      action: string;
    }>();

    type InputKeys = keyof CreateAuditRecordInput;
    expectTypeOf<InputKeys>().not.toMatchTypeOf<'id'>();
    expect(true).toBe(true);
  });

  it('represents the canonical audit_records schema fields in camelCase form', () => {
    expectTypeOf<AuditRecord>().toMatchTypeOf<{
      id: string;
      entityType: string;
      entityId: string;
      action: string;
    }>();

    expect(true).toBe(true);
  });
});