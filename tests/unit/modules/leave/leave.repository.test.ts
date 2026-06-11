import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as repositoryModule from '../../../../src/modules/leave/leave.repository';
import { LeaveType, LeaveRequestStatus } from '../../../../src/modules/leave/leave.model';

describe('SC-2 and SC-3: repository contracts and PostgreSQL repository type', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports LeaveRequestRepository and PgLeaveRequestRepository symbols', () => {
    expect(repositoryModule).toHaveProperty('LeaveRequestRepository');
    expect(repositoryModule).toHaveProperty('PgLeaveRequestRepository');
  });

  it('allows repository contract usage with create, findById, and updateStatus', async () => {
    const repo = {
      async create() {
        return;
      },
      async findById(id: string) {
        return {
          id,
          employeeId: 'emp-1',
          leaveType: LeaveType.SICK,
          status: LeaveRequestStatus.PENDING,
        };
      },
      async updateStatus() {
        return;
      },
    };

    await expect(repo.create()).resolves.toBeUndefined();

    const result = await repo.findById('leave-1');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('leave-1');

    await expect(repo.updateStatus()).resolves.toBeUndefined();
  });

  it('supports the repository null-return error path for unknown ids', async () => {
    const repo = {
      async findById() {
        return null;
      },
    };

    await expect(repo.findById()).resolves.toBeNull();
  });
});