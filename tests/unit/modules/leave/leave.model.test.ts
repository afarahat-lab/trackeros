import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import { } from '../../../../src/modules/leave/leave.model';

describe('SC-1 leave.model exports and shape', () => {
  it('supports valid LeaveRequest fields and enum-like union values', () => {
    const request: LeaveRequest = {
      id: 'leave-1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      status: 'PENDING',
      approverEmployeeId: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };

    expect(request.id).toBe('leave-1');
    expect(request.employeeId).toBe('emp-1');
    expect(['ANNUAL', 'SICK', 'EMERGENCY']).toContain(request.leaveType);
    expect(['PENDING', 'APPROVED', 'REJECTED']).toContain(request.status);
    expect(request.startDate).toBeInstanceOf(Date);
    expect(request.endDate).toBeInstanceOf(Date);
    expect(request.createdAt).toBeInstanceOf(Date);
    expect(request).toHaveProperty('approverEmployeeId');
  });

  it('allows approverEmployeeId to contain a string value', () => {
    const request: LeaveRequest = {
      id: 'leave-2',
      employeeId: 'emp-2',
      leaveType: 'SICK',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-03'),
      status: 'APPROVED',
      approverEmployeeId: 'manager-1',
      createdAt: new Date('2025-02-01T00:00:00Z'),
    };

    expect(request.approverEmployeeId).toBe('manager-1');
  });
});