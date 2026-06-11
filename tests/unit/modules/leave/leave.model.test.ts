import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports leave domain types', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports valid LeaveType and LeaveRequestStatus values in a LeaveRequest', async () => {
    const model = await import('../../../../src/modules/leave/leave.model');

    const annualRequest: LeaveRequest = {
      id: '1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      status: 'PENDING',
    };

    const sickRequest: LeaveRequest = {
      id: '2',
      employeeId: 'emp-2',
      leaveType: 'SICK',
      status: 'APPROVED',
    };

    const emergencyRequest: LeaveRequest = {
      id: '3',
      employeeId: 'emp-3',
      leaveType: 'EMERGENCY',
      status: 'REJECTED',
    };

    expect(model).toBeDefined();
    expect(annualRequest.leaveType).toBe('ANNUAL');
    expect(sickRequest.leaveType).toBe('SICK');
    expect(emergencyRequest.leaveType).toBe('EMERGENCY');
    expect(annualRequest.status).toBe('PENDING');
    expect(sickRequest.status).toBe('APPROVED');
    expect(emergencyRequest.status).toBe('REJECTED');
  });

  it('contains required LeaveRequest fields', () => {
    const request: LeaveRequest = {
      id: 'leave-id',
      employeeId: 'employee-id',
      leaveType: 'ANNUAL',
      status: 'PENDING',
    };

    expect(Object.keys(request).sort()).toEqual([
      'employeeId',
      'id',
      'leaveType',
      'status',
    ].sort());
  });
});