import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuditRecord } from '../../../../src/modules/audit/audit.model';

describe('SC-2 audit.model exports', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('supports the AuditRecord interface shape', () => {
    const record: AuditRecord = {
      id: 'audit-1',
      entityType: 'LeaveRequest',
      entityId: 'lr-1',
      action: 'CREATE',
      createdAt: new Date()
    };

    expect(record.entityType).toBe('LeaveRequest');
    expect(record.action).toBe('CREATE');
  });
});