import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuditRecord, CreateAuditRecordInput } from '../../../../src/modules/audit/audit.model';

describe('SC-1: Audit model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines AuditRecord with id, entityType, entityId, and action fields', () => {
    const record: AuditRecord = {
      id: 'uuid-1',
      entityType: 'user',
      entityId: 'uuid-2',
      action: 'created',
    };

    expect(record.id).toBe('uuid-1');
    expect(record.entityType).toBe('user');
    expect(record.entityId).toBe('uuid-2');
    expect(record.action).toBe('created');
    expect(Object.keys(record).sort()).toEqual(['action', 'entityId', 'entityType', 'id'].sort());
  });

  it('defines CreateAuditRecordInput with entityType, entityId, and action fields and no id requirement', () => {
    const input: CreateAuditRecordInput = {
      entityType: 'order',
      entityId: 'uuid-3',
      action: 'updated',
    };

    expect(input.entityType).toBe('order');
    expect(input.entityId).toBe('uuid-3');
    expect(input.action).toBe('updated');
    expect('id' in input).toBe(false);
  });
});
