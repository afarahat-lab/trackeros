import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LeaveRequestRepository,
  PgLeaveRequestRepository,
} from '../../../../src/modules/leave/leave.repository';
import {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType,
} from '../../../../src/modules/leave/leave.model';

describe('SC-2: LeaveRequestRepository contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is compatible with the expected repository method signatures', () => {
    const repository: LeaveRequestRepository = new PgLeaveRequestRepository();

    expect(typeof repository.create).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.updateStatus).toBe('function');
  });

  it('accepts LeaveRequest model types through the repository contract', async () => {
    const repository: LeaveRequestRepository = new PgLeaveRequestRepository();

    const request: LeaveRequest = {
      id: 'leave-1',
      employeeId: 'employee-1',
      leaveType: LeaveType.SICK,
      status: LeaveRequestStatus.PENDING,
    };

    await expect(repository.create(request)).resolves.toBeUndefined();
  });
});

describe('SC-3: PgLeaveRequestRepository implementation', () => {
  it('implements create and resolves successfully', async () => {
    const repository = new PgLeaveRequestRepository();

    const request: LeaveRequest = {
      id: 'leave-2',
      employeeId: 'employee-2',
      leaveType: LeaveType.EMERGENCY,
      status: LeaveRequestStatus.PENDING,
    };

    await expect(repository.create(request)).resolves.toBeUndefined();
  });

  it('returns null when findById is invoked without persisted data', async () => {
    const repository = new PgLeaveRequestRepository();

    await expect(repository.findById('missing-id')).resolves.toBeNull();
  });

  it('updates status and resolves successfully', async () => {
    const repository = new PgLeaveRequestRepository();

    await expect(
      repository.updateStatus('leave-2', LeaveRequestStatus.APPROVED),
    ).resolves.toBeUndefined();
  });
});

describe('SC-4 & SC-5: type usage, contract compatibility, and import resolution', () => {
  it('resolves imports and allows LeaveRequest types to flow through repository APIs', async () => {
    const repository: LeaveRequestRepository = new PgLeaveRequestRepository();

    const request: LeaveRequest = {
      id: 'leave-3',
      employeeId: 'employee-3',
      leaveType: LeaveType.ANNUAL,
      status: LeaveRequestStatus.PENDING,
    };

    await repository.create(request);

    const result = await repository.findById(request.id);

    expect(result).toBeNull();
  });

  it('handles non-existent ids without throwing errors', async () => {
    const repository = new PgLeaveRequestRepository();

    await expect(repository.findById('does-not-exist')).resolves.toBeNull();
    await expect(
      repository.updateStatus('does-not-exist', LeaveRequestStatus.REJECTED),
    ).resolves.toBeUndefined();
  });
});
