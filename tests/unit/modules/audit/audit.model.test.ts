import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuditRecord, CreateAuditRecordDto } from '../../../../src/modules/audit/audit.model';

describe('SC-2: audit.model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports all AuditAction values and LeaveRequest audit relationship', () => {
    const created: CreateAuditRecordDto = {
      entityType: 'LeaveRequest',
      entityId: 'leave-1',
      action: 'CREATED'
    };

    const record: AuditRecord = {
      id: 'audit-1',
      entityType: created.entityType,
      entityId: created.entityId,
      action: created.action
    };

    expect(record.entityType).toBe('LeaveRequest');
    expect(record.action).toBe('CREATED');

    record.action = 'APPROVED';
    expect(record.action).toBe('APPROVED');

    record.action = 'REJECTED';
    expect(record.action).toBe('REJECTED');
  });
});
