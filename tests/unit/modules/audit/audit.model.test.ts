import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  AuditAction,
  AuditRecord,
  CreateAuditRecordDto
} from '../../../../src/modules/audit/audit.model';

describe('SC-2: audit.model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports all documented AuditAction values', () => {
    const values: AuditAction[] = ['CREATED', 'APPROVED', 'REJECTED'];
    expect(values).toEqual(['CREATED', 'APPROVED', 'REJECTED']);
  });

  it('allows AuditRecord and CreateAuditRecordDto shapes as specified', () => {
    const dto: CreateAuditRecordDto = {
      entityType: 'LeaveRequest',
      entityId: 'leave-1',
      action: 'CREATED'
    };

    const record: AuditRecord = {
      id: 'audit-1',
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action
    };

    expect(record).toEqual({
      id: 'audit-1',
      entityType: 'LeaveRequest',
      entityId: 'leave-1',
      action: 'CREATED'
    });
  });
});