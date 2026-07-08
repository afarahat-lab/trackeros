import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestQueryParams } from '../../../../src/modules/leave/leave.model';
import { ILeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveRequestStatus } from '../../../../src/shared/types/leave.types';

class MockLeaveRepository implements ILeaveRepository {
  private requests: LeaveRequest[] = [];

  async findByEmployeeId(
    employeeId: string,
    params?: LeaveRequestQueryParams,
  ): Promise<LeaveRequest[]> {
    let result = this.requests.filter((r) => r.employeeId === employeeId);
    if (params?.leavePolicyId) {
      result = result.filter((r) => r.leavePolicyId === params.leavePolicyId);
    }
    if (params?.status) {
      result = result.filter((r) => r.status === params.status);
    }
    return result;
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    return this.requests.find((r) => r.id === id) ?? null;
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const now = new Date();
    const request: LeaveRequest = {
      ...dto,
      id: `lr-${this.requests.length + 1}`,
      status: LeaveRequestStatus.DRAFT,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      cancelledBy: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: now,
      updatedAt: now,
    };
    this.requests.push(request);
    return request;
  }

  async updateStatus(
    id: string,
    status: LeaveRequestStatus,
    metadata: Partial<
      Pick<
        LeaveRequest,
        | 'approvedBy'
        | 'approvedAt'
        | 'rejectedBy'
        | 'rejectedAt'
        | 'rejectionReason'
        | 'cancelledBy'
        | 'cancelledAt'
        | 'cancellationReason'
      >
    >,
  ): Promise<LeaveRequest | null> {
    const index = this.requests.findIndex((r) => r.id === id);
    if (index === -1) return null;
    this.requests[index] = {
      ...this.requests[index],
      status,
      ...metadata,
      updatedAt: new Date(),
    };
    return this.requests[index];
  }

  async findAll(params?: LeaveRequestQueryParams): Promise<LeaveRequest[]> {
    let result = [...this.requests];
    if (params?.employeeId) {
      result = result.filter((r) => r.employeeId === params.employeeId);
    }
    if (params?.leavePolicyId) {
      result = result.filter((r) => r.leavePolicyId === params.leavePolicyId);
    }
    if (params?.status) {
      result = result.filter((r) => r.status === params.status);
    }
    return result;
  }
}

const makeCreateDto = (
  overrides?: Partial<CreateLeaveRequestDto>,
): CreateLeaveRequestDto => ({
  employeeId: 'emp-1',
  leavePolicyId: 'policy-1',
  startDate: new Date('2026-08-01'),
  endDate: new Date('2026-08-05'),
  reason: 'Family vacation',
  ...overrides,
});

describe('ILeaveRepository', () => {
  let repo: ILeaveRepository;

  beforeEach(() => {
    repo = new MockLeaveRepository();
  });

  describe('create', () => {
    it('should create a leave request with DRAFT status and generated id and timestamps', async () => {
      const dto = makeCreateDto();
      const result = await repo.create(dto);

      expect(result.id).toBeDefined();
      expect(result.employeeId).toBe(dto.employeeId);
      expect(result.leavePolicyId).toBe(dto.leavePolicyId);
      expect(result.startDate).toEqual(dto.startDate);
      expect(result.endDate).toEqual(dto.endDate);
      expect(result.reason).toBe(dto.reason);
      expect(result.status).toBe(LeaveRequestStatus.DRAFT);
      expect(result.approvedBy).toBeNull();
      expect(result.approvedAt).toBeNull();
      expect(result.rejectedBy).toBeNull();
      expect(result.rejectedAt).toBeNull();
      expect(result.rejectionReason).toBeNull();
      expect(result.cancelledBy).toBeNull();
      expect(result.cancelledAt).toBeNull();
      expect(result.cancellationReason).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('should return the leave request when it exists', async () => {
      const created = await repo.create(makeCreateDto());
      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null when the leave request does not exist', async () => {
      const found = await repo.findById('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return all leave requests for a given employee', async () => {
      await repo.create(makeCreateDto({ employeeId: 'emp-1' }));
      await repo.create(makeCreateDto({ employeeId: 'emp-1', reason: 'Medical appointment' }));
      await repo.create(makeCreateDto({ employeeId: 'emp-2', reason: 'Personal day' }));

      const results = await repo.findByEmployeeId('emp-1');
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.employeeId === 'emp-1')).toBe(true);
    });

    it('should filter by leavePolicyId when provided', async () => {
      await repo.create(makeCreateDto({ employeeId: 'emp-1', leavePolicyId: 'policy-1' }));
      await repo.create(makeCreateDto({ employeeId: 'emp-1', leavePolicyId: 'policy-2', reason: 'Sick day' }));

      const results = await repo.findByEmployeeId('emp-1', { leavePolicyId: 'policy-2' });
      expect(results).toHaveLength(1);
      expect(results[0].leavePolicyId).toBe('policy-2');
    });

    it('should filter by status when provided', async () => {
      const created = await repo.create(makeCreateDto({ employeeId: 'emp-1' }));
      await repo.updateStatus(created.id, LeaveRequestStatus.APPROVED, {
        approvedBy: 'mgr-1',
        approvedAt: new Date(),
      });

      const results = await repo.findByEmployeeId('emp-1', { status: LeaveRequestStatus.APPROVED });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(LeaveRequestStatus.APPROVED);
    });

    it('should return empty array when employee has no requests', async () => {
      const results = await repo.findByEmployeeId('emp-nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all leave requests when no params are given', async () => {
      await repo.create(makeCreateDto());
      await repo.create(makeCreateDto({ employeeId: 'emp-2', reason: 'Personal day' }));

      const results = await repo.findAll();
      expect(results).toHaveLength(2);
    });

    it('should filter by employeeId', async () => {
      await repo.create(makeCreateDto({ employeeId: 'emp-1' }));
      await repo.create(makeCreateDto({ employeeId: 'emp-2', reason: 'Personal day' }));

      const results = await repo.findAll({ employeeId: 'emp-1' });
      expect(results).toHaveLength(1);
      expect(results[0].employeeId).toBe('emp-1');
    });

    it('should filter by leavePolicyId', async () => {
      await repo.create(makeCreateDto({ leavePolicyId: 'policy-1' }));
      await repo.create(makeCreateDto({ leavePolicyId: 'policy-2', reason: 'Sick day' }));

      const results = await repo.findAll({ leavePolicyId: 'policy-2' });
      expect(results).toHaveLength(1);
      expect(results[0].leavePolicyId).toBe('policy-2');
    });

    it('should filter by status', async () => {
      const created = await repo.create(makeCreateDto());
      await repo.updateStatus(created.id, LeaveRequestStatus.REJECTED, {
        rejectedBy: 'mgr-1',
        rejectedAt: new Date(),
        rejectionReason: 'Insufficient coverage',
      });

      const results = await repo.findAll({ status: LeaveRequestStatus.REJECTED });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(LeaveRequestStatus.REJECTED);
    });

    it('should return empty array when no requests exist', async () => {
      const results = await repo.findAll();
      expect(results).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update status to APPROVED with approval metadata', async () => {
      const created = await repo.create(makeCreateDto());
      const now = new Date();
      const updated = await repo.updateStatus(created.id, LeaveRequestStatus.APPROVED, {
        approvedBy: 'mgr-1',
        approvedAt: now,
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe(LeaveRequestStatus.APPROVED);
      expect(updated!.approvedBy).toBe('mgr-1');
      expect(updated!.approvedAt).toEqual(now);
      expect(updated!.updatedAt).toBeInstanceOf(Date);
    });

    it('should update status to REJECTED with rejection metadata', async () => {
      const created = await repo.create(makeCreateDto());
      const now = new Date();
      const updated = await repo.updateStatus(created.id, LeaveRequestStatus.REJECTED, {
        rejectedBy: 'mgr-2',
        rejectedAt: now,
        rejectionReason: 'Team understaffed',
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe(LeaveRequestStatus.REJECTED);
      expect(updated!.rejectedBy).toBe('mgr-2');
      expect(updated!.rejectedAt).toEqual(now);
      expect(updated!.rejectionReason).toBe('Team understaffed');
    });

    it('should update status to CANCELLED with cancellation metadata', async () => {
      const created = await repo.create(makeCreateDto());
      const now = new Date();
      const updated = await repo.updateStatus(created.id, LeaveRequestStatus.CANCELLED, {
        cancelledBy: 'emp-1',
        cancelledAt: now,
        cancellationReason: 'No longer needed',
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(updated!.cancelledBy).toBe('emp-1');
      expect(updated!.cancelledAt).toEqual(now);
      expect(updated!.cancellationReason).toBe('No longer needed');
    });

    it('should return null when the leave request does not exist', async () => {
      const updated = await repo.updateStatus('nonexistent', LeaveRequestStatus.APPROVED, {
        approvedBy: 'mgr-1',
        approvedAt: new Date(),
      });
      expect(updated).toBeNull();
    });
  });
});
