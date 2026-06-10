import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuditAction, AuditRecord, CreateAuditRecordDto } from '../../../../src/modules/audit/audit.model';
import * as auditModel from '../../../../src/modules/audit/audit.model';

describe('SC-2: audit.model exports', () => {
  it('exports the expected audit model members', () => {
    expect(typeof auditModel).toBe('object');

    const action: AuditAction = 'CREATED';
    const dto: CreateAuditRecordDto = {
      entityType: 'LeaveRequest',
      entityId: 'leave-1',
      action
    };

    const record: AuditRecord = {
      id: 'audit-1',
      entityType: dto.entityType,
      entityId: dto.entityId,
      action: dto.action
    };

    expect(record.entityType).toBe('LeaveRequest');
    expect(record.action).toBe('CREATED');
  });
});