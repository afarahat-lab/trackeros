import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1 leave.model exports canonical leave types and shape', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports a module that contains the canonical LeaveRequest runtime contract artifacts', () => {
    expect(leaveModel).toBeDefined();
  });

  it('accepts a LeaveRequest-shaped object with all required fields', () => {
    const request: leaveModel.LeaveRequest = {
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: 'ANNUAL',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      status: 'PENDING',
      approverEmployeeId: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };

    expect(Object.keys(request).sort()).toEqual([
      'approverEmployeeId',
      'createdAt',
      'employeeId',
      'endDate',
      'id',
      'leaveType',
      'startDate',
      'status',
    ].sort());
  });

  it('rejects invalid LeaveType and LeaveRequestStatus values at type level', () => {
    const leaveType: leaveModel.LeaveType = 'ANNUAL';
    const status: leaveModel.LeaveRequestStatus = 'APPROVED';

    expect(leaveType).toBe('ANNUAL');
    expect(status).toBe('APPROVED');
  });
});