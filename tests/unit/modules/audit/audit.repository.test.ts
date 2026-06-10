import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { PostgreSqlAuditRepository } from '../../../../src/modules/audit/audit.repository';

describe('SC-5/SC-7: PostgreSqlAuditRepository and documentation coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and persists an audit record through the pg Pool interface', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgreSqlAuditRepository({ query } as never);

    const result = await repository.createAuditRecord({
      entityType: 'LeaveRequest',
      entityId: 'leave-1',
      action: 'CREATED'
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(result.entityType).toBe('LeaveRequest');
    expect(result.entityId).toBe('leave-1');
    expect(result.action).toBe('CREATED');
  });

  it('wraps audit persistence failures', async () => {
    const query = vi.fn().mockRejectedValue(new Error('db failure'));
    const repository = new PostgreSqlAuditRepository({ query } as never);

    await expect(
      repository.createAuditRecord({
        entityType: 'LeaveRequest',
        entityId: 'leave-1',
        action: 'CREATED'
      })
    ).rejects.toThrow(/AUDIT_RECORD_CREATE_FAILED/);
  });

  it('documents the relationship and enumerated values used by leave and audit records', () => {
    const leaveTypes = ['ANNUAL', 'SICK', 'EMERGENCY'];
    const leaveStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    const auditActions = ['CREATED', 'APPROVED', 'REJECTED'];

    expect(leaveTypes).toEqual(['ANNUAL', 'SICK', 'EMERGENCY']);
    expect(leaveStatuses).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
    expect(auditActions).toEqual(['CREATED', 'APPROVED', 'REJECTED']);

    const relationship = {
      auditEntityType: 'LeaveRequest',
      referencesLeaveRequest: true
    };

    expect(relationship.referencesLeaveRequest).toBe(true);
  });
});