import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import { PgLeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';

describe('SC-2: LeaveRequestRepository contract shape', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes create, findById and updateStatus methods', () => {
    const repository = new PgLeaveRequestRepository();

    expect(typeof repository.create).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.updateStatus).toBe('function');
  });

  it('returns promises from repository methods', () => {
    const repository = new PgLeaveRequestRepository();

    const request: LeaveRequest = {
      id: 'id',
      employeeId: 'emp',
      leaveType: 'ANNUAL',
      status: 'PENDING',
    };

    expect(repository.create(request)).toBeInstanceOf(Promise);
    expect(repository.findById('id')).toBeInstanceOf(Promise);
    expect(repository.updateStatus('id', 'APPROVED')).toBeInstanceOf(Promise);
  });
});

describe('SC-3: PgLeaveRequestRepository PostgreSQL-facing repository type', () => {
  it('can be instantiated as a repository implementation', () => {
    const repository = new PgLeaveRequestRepository();

    expect(repository).toBeInstanceOf(PgLeaveRequestRepository);
  });

  it('throws not implemented errors for deferred methods', async () => {
    const repository = new PgLeaveRequestRepository();

    await expect(repository.create({
      id: 'id',
      employeeId: 'emp',
      leaveType: 'ANNUAL',
      status: 'PENDING',
    })).rejects.toThrow('create is not implemented');

    await expect(repository.findById('id')).rejects.toThrow('findById is not implemented');

    await expect(repository.updateStatus('id', 'REJECTED')).rejects.toThrow('updateStatus is not implemented');
  });
});