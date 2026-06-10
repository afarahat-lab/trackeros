import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports the expected runtime module object', () => {
    expect(leaveModel).toBeDefined();
    expect(typeof leaveModel).toBe('object');
  });

  it('supports the documented type contracts via compile-time usage', () => {
    type LeaveRequestStatus = import('../../../../src/modules/leave/leave.model').LeaveRequestStatus;
    type LeaveType = import('../../../../src/modules/leave/leave.model').LeaveType;
    type LeaveRequest = import('../../../../src/modules/leave/leave.model').LeaveRequest;
    type CreateLeaveRequestInput = import('../../../../src/modules/leave/leave.model').CreateLeaveRequestInput;
    type AuditRecord = import('../../../../src/modules/leave/leave.model').AuditRecord;

    const status: LeaveRequestStatus = 'PENDING';
    const leaveType: LeaveType = 'ANNUAL';

    const request: LeaveRequest = {
      id: 'lr-1',
      employeeId: 'emp-1',
      leaveType,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      status,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    const input: CreateLeaveRequestInput = {
      id: 'lr-1',
      employeeId: 'emp-1',
      leaveType,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
    };

    const audit: AuditRecord = {
      entityId: 'lr-1',
      entityType: 'LEAVE_REQUEST',
      action: 'CREATE',
      performedBy: 'manager-1',
      createdAt: new Date('2025-01-01'),
    };

    expect(request.status).toBe('PENDING');
    expect(input.employeeId).toBe('emp-1');
    expect(audit.entityType).toBe('LEAVE_REQUEST');
  });
});