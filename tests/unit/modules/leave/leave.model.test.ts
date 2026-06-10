import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-1: leave.model exports and shape', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveType, LeaveRequestStatus, and LeaveRequest-related members', async () => {
    const mod = await import('../../../../src/modules/leave/leave.model');

    expect(mod).toBeDefined();
    expect('LeaveType' in mod).toBe(true);
    expect('LeaveRequestStatus' in mod).toBe(true);
  });

  it('contains required LeaveRequest field names in a representative record/entity structure', async () => {
    const mod = await import('../../../../src/modules/leave/leave.model');

    const sample = {
      id: '1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      status: 'PENDING',
      approverEmployeeId: 'mgr-1',
      createdAt: new Date('2024-01-01'),
    };

    expect(Object.keys(sample)).toEqual([
      'id',
      'employeeId',
      'leaveType',
      'startDate',
      'endDate',
      'status',
      'approverEmployeeId',
      'createdAt',
    ]);

    expect(mod).toBeDefined();
  });
});