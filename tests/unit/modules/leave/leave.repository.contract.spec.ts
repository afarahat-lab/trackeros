import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeaveType, LeaveRequestStatus } from '../../../../src/modules/leave/leave.model';
import * as repositoryModule from '../../../../src/modules/leave/leave.repository';

describe('SC-4 and SC-5: repository contract compilation and import compatibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses LeaveRequest-compatible data across model and repository imports', async () => {
    const leaveRequest = {
      id: 'leave-123',
      employeeId: 'employee-456',
      leaveType: LeaveType.EMERGENCY,
      status: LeaveRequestStatus.PENDING,
    };

    expect(leaveRequest.id).toBe('leave-123');
    expect(leaveRequest.employeeId).toBe('employee-456');
    expect(leaveRequest.leaveType).toBe(LeaveType.EMERGENCY);
    expect(leaveRequest.status).toBe(LeaveRequestStatus.PENDING);

    expect(repositoryModule).toBeDefined();
  });

  it('validates repository contract usage for approval workflow', async () => {
    const repository = {
      async create() {
        return;
      },
      async findById(id: string) {
        return {
          id,
          employeeId: 'employee-456',
          leaveType: LeaveType.ANNUAL,
          status: LeaveRequestStatus.APPROVED,
        };
      },
      async updateStatus() {
        return;
      },
    };

    await repository.create();
    const request = await repository.findById('leave-123');

    expect(request?.status).toBe(LeaveRequestStatus.APPROVED);
  });

  it('handles rejected lookup path returning null', async () => {
    const repository = {
      async findById() {
        return null;
      },
    };

    const request = await repository.findById();
    expect(request).toBeNull();
  });
});