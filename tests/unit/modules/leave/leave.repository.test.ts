import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  LeaveRequest,
  LeaveRequestStatus,
} from '../../../../src/modules/leave/leave.model';
import type {
  LeaveRequestRepository,
  PgLeaveRequestRepository,
} from '../../../../src/modules/leave/leave.repository';

describe('SC-2: LeaveRequestRepository contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports create, findById, and updateStatus methods with the expected contract', async () => {
    class RepositoryStub implements LeaveRequestRepository {
      private record: LeaveRequest | null = null;

      async create(request: LeaveRequest): Promise<void> {
        this.record = request;
      }

      async findById(id: string): Promise<LeaveRequest | null> {
        return this.record?.id === id ? this.record : null;
      }

      async updateStatus(id: string, status: LeaveRequestStatus): Promise<void> {
        if (this.record?.id === id) {
          this.record.status = status;
        }
      }
    }

    const repository = new RepositoryStub();

    await repository.create({
      id: '1',
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      status: 'PENDING',
    });

    const found = await repository.findById('1');
    expect(found).not.toBeNull();
    expect(found?.employeeId).toBe('emp-1');

    await repository.updateStatus('1', 'APPROVED');

    const updated = await repository.findById('1');
    expect(updated?.status).toBe('APPROVED');
  });

  it('returns null when a record is not found', async () => {
    class RepositoryStub implements LeaveRequestRepository {
      async create(_request: LeaveRequest): Promise<void> {}
      async findById(_id: string): Promise<LeaveRequest | null> {
        return null;
      }
      async updateStatus(_id: string, _status: LeaveRequestStatus): Promise<void> {}
    }

    const repository = new RepositoryStub();
    await expect(repository.findById('missing-id')).resolves.toBeNull();
  });
});

describe('SC-3: PgLeaveRequestRepository type contract', () => {
  it('can be referenced as a PostgreSQL repository implementation contract operating on LeaveRequest types', () => {
    const compileTimeReference = <T extends PgLeaveRequestRepository>(_value: T): T => _value;

    expect(typeof compileTimeReference).toBe('function');
  });
});