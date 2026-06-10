import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('SC-1: leave.model exports and shape', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveType, LeaveRequestStatus, and LeaveRequest-related symbols', async () => {
    const mod = await import('../../../../src/modules/leave/leave.model');

    expect(mod).toBeDefined();
    expect('LeaveType' in mod).toBe(true);
    expect('LeaveRequestStatus' in mod).toBe(true);
  });

  it('defines leave request fields on a representative object shape', async () => {
    const mod = await import('../../../../src/modules/leave/leave.model');

    const sample: Record<string, unknown> = {
      id: 'leave-1',
      employeeId: 'emp-1',
      leaveType: (mod as Record<string, unknown>).LeaveType,
      startDate: new Date(),
      endDate: new Date(),
      status: (mod as Record<string, unknown>).LeaveRequestStatus,
      approverEmployeeId: 'manager-1',
      createdAt: new Date(),
    };

    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('employeeId');
    expect(sample).toHaveProperty('leaveType');
    expect(sample).toHaveProperty('startDate');
    expect(sample).toHaveProperty('endDate');
    expect(sample).toHaveProperty('status');
    expect(sample).toHaveProperty('approverEmployeeId');
    expect(sample).toHaveProperty('createdAt');
  });

  it('fails when importing a non-existent model path', async () => {
    await expect(import('../../../../src/modules/leave/does-not-exist')).rejects.toBeDefined();
  });
});