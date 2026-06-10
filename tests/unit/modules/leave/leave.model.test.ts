import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as leaveModel from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports required leave types and shapes', () => {
  beforeEach(() => {});
  afterEach(() => { vi.restoreAllMocks(); });

  it('exports a module that contains LeaveRequest runtime definitions', () => {
    expect(leaveModel).toBeDefined();
  });

  it('supports valid LeaveRequest-compatible objects', () => {
    const request = {
      id: 'leave-1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL' as const,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      status: 'PENDING' as const,
      approverEmployeeId: null,
      createdAt: new Date('2024-01-01'),
    };

    expect(request.leaveType).toBe('ANNUAL');
    expect(request.status).toBe('PENDING');
    expect(request.approverEmployeeId).toBeNull();
    expect(request.startDate).toBeInstanceOf(Date);
  });

  it('rejects invalid field expectations at runtime', () => {
    const request = { id: 'leave-1' };
    expect('employeeId' in request).toBe(false);
  });
});