import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuditRecord, CreateAuditRecordInput } from '../../../../src/modules/audit/audit.model';

describe('SC-1: audit.model contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines AuditRecord with required fields', () => {
    const record: AuditRecord = {
      id: '123',
      entityType: 'user',
      entityId: '456',
      action: 'created',
    };

    expect(record.id).toBe('123');
    expect(record.entityType).toBe('user');
    expect(record.entityId).toBe('456');
    expect(record.action).toBe('created');
  });

  it('defines CreateAuditRecordInput with required fields and no id requirement', () => {
    const input: CreateAuditRecordInput = {
      entityType: 'order',
      entityId: '789',
      action: 'updated',
    };

    expect(Object.prototype.hasOwnProperty.call(input, 'id')).toBe(false);
    expect(input.entityType).toBe('order');
    expect(input.entityId).toBe('789');
    expect(input.action).toBe('updated');
  });
});
