import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LeaveType,
  LeaveRequestStatus,
  type LeaveRequest,
} from '../../../../src/modules/leave/leave.model';
import type {
  LeaveRequestRepository,
} from '../../../../src/modules/leave/leave.repository';

describe('SC-4: repository contract usage and type compatibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows LeaveRequest model types to be used through the repository contract', async () => {
    class InMemoryRepository implements LeaveRequestRepository {
      private readonly storage = new Map<string, LeaveRequest>();

      async create(request: LeaveRequest): Promise<void> {
        this.storage.set(request.id, request);
      }

      async findById(id: string): Promise<LeaveRequest | null> {
        return this.storage.get(id) ?? null;
      }

      async updateStatus(id: string, status: typeof LeaveRequestStatus[keyof typeof LeaveRequestStatus]): Promise<void> {
        const existing = this.storage.get(id);
        if (existing) {
          this.storage.set(id, { ...existing, status });
        }
      }
    }

    const repository = new InMemoryRepository();

    const request: LeaveRequest = {
      id: 'leave-42',
      employeeId: 'employee-42',
      leaveType: LeaveType.EMERGENCY,
      status: LeaveRequestStatus.PENDING,
    };

    await repository.create(request);

    const created = await repository.findById('leave-42');
    expect(created).toEqual(request);

    await repository.updateStatus('leave-42', LeaveRequestStatus.REJECTED);

    const updated = await repository.findById('leave-42');
    expect(updated?.status).toBe(LeaveRequestStatus.REJECTED);
  });

  it('handles missing records according to the contract', async () => {
    class EmptyRepository implements LeaveRequestRepository {
      async create(_request: LeaveRequest): Promise<void> {}
      async findById(_id: string): Promise<LeaveRequest | null> {
        return null;
      }
      async updateStatus(_id: string, _status: typeof LeaveRequestStatus[keyof typeof LeaveRequestStatus]): Promise<void> {}
    }

    const repository = new EmptyRepository();
    const result = await repository.findById('does-not-exist');

    expect(result).toBeNull();
  });
});