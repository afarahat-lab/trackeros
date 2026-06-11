import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports all required LeaveType values', () => {
    const annual: leaveModel.LeaveType = 'ANNUAL';
    const sick: leaveModel.LeaveType = 'SICK';
    const emergency: leaveModel.LeaveType = 'EMERGENCY';

    expect([annual, sick, emergency]).toEqual(['ANNUAL', 'SICK', 'EMERGENCY']);
  });

  it('supports all required LeaveRequestStatus values', () => {
    const pending: leaveModel.LeaveRequestStatus = 'PENDING';
    const approved: leaveModel.LeaveRequestStatus = 'APPROVED';
    const rejected: leaveModel.LeaveRequestStatus = 'REJECTED';

    expect([pending, approved, rejected]).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
  });

  it('supports a LeaveRequest object with all required fields', () => {
    const request: leaveModel.LeaveRequest = {
      id: '1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      status: 'PENDING',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01')
    };

    expect(Object.keys(request).sort()).toEqual([
      'createdAt',
      'employeeId',
      'endDate',
      'id',
      'leaveType',
      'startDate',
      'status',
      'updatedAt'
    ]);
  });
});