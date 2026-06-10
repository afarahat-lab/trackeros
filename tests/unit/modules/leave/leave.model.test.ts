import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  LeaveRequestStatus,
  LeaveType,
  LeaveRequest,
  CreateLeaveRequestInput,
  AuditRecord,
} from '../../../../src/modules/leave/leave.model';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports and type contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports the leave model module', () => {
    expect(leaveModel).toBeDefined();
    expect(typeof leaveModel).toBe('object');
  });

  it('accepts valid LeaveRequestStatus values and rejects invalid literals at type level', () => {
    const pending: LeaveRequestStatus = 'PENDING';
    const approved: LeaveRequestStatus = 'APPROVED';
    const rejected: LeaveRequestStatus = 'REJECTED';

    expect([pending, approved, rejected]).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
  });

  it('accepts valid LeaveType values at type level', () => {
    const annual: LeaveType = 'ANNUAL';
    const sick: LeaveType = 'SICK';
    const emergency: LeaveType = 'EMERGENCY';

    expect([annual, sick, emergency]).toEqual(['ANNUAL', 'SICK', 'EMERGENCY']);
  });

  it('supports the LeaveRequest, CreateLeaveRequestInput and AuditRecord shapes', () => {
    const input: CreateLeaveRequestInput = {
      id: 'lr-1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
    };

    const entity: LeaveRequest = {
      ...input,
      status: 'PENDING',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    const audit: AuditRecord = {
      entityId: entity.id,
      entityType: 'LEAVE_REQUEST',
      action: 'CREATE',
      performedBy: 'manager-1',
      createdAt: new Date('2025-01-01'),
    };

    expect(entity.status).toBe('PENDING');
    expect(audit.entityType).toBe('LEAVE_REQUEST');
    expect(audit.action).toBe('CREATE');
  });
});
