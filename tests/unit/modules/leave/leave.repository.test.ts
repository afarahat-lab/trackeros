import { ILeaveRepository, KnexLeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveRequest } from '../../../../src/modules/leave/leave.model';
import { LeaveType, LeaveRequestStatus } from '../../../../src/shared/types/leave.types';
import { Knex } from 'knex';

interface TestRow {
  id: string;
  employeeId: string;
  leaveType: string;
  leavePolicyId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  managerId: string | null;
  managerComment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const now = new Date('2026-07-27T00:00:00.000Z');
const nowStr = now.toISOString();

function makeRow(overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leaveType: 'ANNUAL',
    leavePolicyId: 'lp-001',
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    totalDays: 5,
    reason: 'Vacation',
    status: 'DRAFT',
    managerId: null,
    managerComment: null,
    submittedAt: null,
    reviewedAt: null,
    createdAt: nowStr,
    updatedAt: nowStr,
    ...overrides,
  };
}

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leaveType: LeaveType.ANNUAL,
    leavePolicyId: 'lp-001',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-05'),
    totalDays: 5,
    reason: 'Vacation',
    status: LeaveRequestStatus.DRAFT,
    managerId: null,
    managerComment: null,
    submittedAt: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}



describe('ILeaveRepository', () => {
  it('should extend IBaseRepository<LeaveRequest> with additional methods', () => {
    // Structural test: verify the interface shape by implementing it
    class TestLeaveRepo implements ILeaveRepository {
      async findById(_id: string): Promise<LeaveRequest | null> { return null; }
      async findAll(): Promise<LeaveRequest[]> { return []; }
      async findByEmployeeId(_employeeId: string): Promise<LeaveRequest[]> { return []; }
      async findByStatus(_status: string): Promise<LeaveRequest[]> { return []; }
      async create(_entity: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
        return makeLeaveRequest();
      }
      async update(_id: string, _entity: Partial<LeaveRequest>): Promise<LeaveRequest | null> { return null; }
      async delete(_id: string): Promise<boolean> { return true; }
    }

    const repo = new TestLeaveRepo();
    expect(repo).toBeDefined();
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.findAll).toBe('function');
    expect(typeof repo.findByEmployeeId).toBe('function');
    expect(typeof repo.findByStatus).toBe('function');
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.update).toBe('function');
    expect(typeof repo.delete).toBe('function');
  });
});

describe('KnexLeaveRepository', () => {
  let repo: KnexLeaveRepository;
  let mockKnex: jest.Mocked<Knex>;
  let mockQb: jest.Mocked<Knex.QueryBuilder>;

  beforeEach(() => {
    mockQb = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Knex.QueryBuilder>;

    mockKnex = jest.fn(() => mockQb) as unknown as jest.Mocked<Knex>;
    (mockKnex as unknown as Record<string, unknown>).QueryBuilder = {};
    (mockKnex as unknown as Record<string, unknown>).client = { config: { client: 'pg' } };

    repo = new KnexLeaveRepository(mockKnex);
  });

  describe('findById', () => {
    it('should return a LeaveRequest when found', async () => {
      const row = makeRow();
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findById('lr-001');

      expect(mockKnex).toHaveBeenCalledWith('leave_requests');
      expect(mockQb.where).toHaveBeenCalledWith({ id: 'lr-001' });
      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-001');
      expect(result!.employeeId).toBe('emp-001');
      expect(result!.leaveType).toBe(LeaveType.ANNUAL);
      expect(result!.startDate).toEqual(new Date('2026-08-01'));
      expect(result!.endDate).toEqual(new Date('2026-08-05'));
      expect(result!.totalDays).toBe(5);
    });

    it('should return null when not found', async () => {
      mockQb.first = jest.fn().mockResolvedValue(null);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all leave requests', async () => {
      const rows = [makeRow(), makeRow({ id: 'lr-002', employeeId: 'emp-002' })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findAll();

      expect(mockQb.select).toHaveBeenCalledWith('*');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-001');
      expect(result[1].id).toBe('lr-002');
    });

    it('should return empty array when no records', async () => {
      mockQb.select = jest.fn().mockResolvedValue([]);

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for a given employee', async () => {
      const rows = [makeRow(), makeRow({ id: 'lr-003' })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findByEmployeeId('emp-001');

      expect(mockQb.where).toHaveBeenCalledWith({ employeeId: 'emp-001' });
      expect(result).toHaveLength(2);
    });
  });

  describe('findByStatus', () => {
    it('should return leave requests with a given status', async () => {
      const rows = [makeRow({ status: 'APPROVED' })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findByStatus('APPROVED');

      expect(mockQb.where).toHaveBeenCalledWith({ status: 'APPROVED' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveRequestStatus.APPROVED);
    });
  });

  describe('create', () => {
    it('should insert and return a new LeaveRequest', async () => {
      const row = makeRow();
      mockQb.returning = jest.fn().mockResolvedValue([row]);

      const input: Omit<LeaveRequest, 'id'> = {
        employeeId: 'emp-001',
        leaveType: LeaveType.ANNUAL,
        leavePolicyId: 'lp-001',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-05'),
        totalDays: 5,
        reason: 'Vacation',
        status: LeaveRequestStatus.DRAFT,
        managerId: null,
        managerComment: null,
        submittedAt: null,
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const result = await repo.create(input);

      expect(mockQb.insert).toHaveBeenCalledWith(input);
      expect(result.id).toBe('lr-001');
    });
  });

  describe('update', () => {
    it('should update and return the updated LeaveRequest', async () => {
      const row = makeRow({ status: 'SUBMITTED', updatedAt: nowStr });
      mockQb.returning = jest.fn().mockResolvedValue([row]);

      const result = await repo.update('lr-001', { status: LeaveRequestStatus.SUBMITTED });

      expect(mockQb.where).toHaveBeenCalledWith({ id: 'lr-001' });
      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should return null when updating nonexistent record', async () => {
      mockQb.returning = jest.fn().mockResolvedValue([]);

      const result = await repo.update('nonexistent', { reason: 'new reason' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when a record is deleted', async () => {
      mockQb.delete = jest.fn().mockResolvedValue(1);

      const result = await repo.delete('lr-001');

      expect(mockQb.where).toHaveBeenCalledWith({ id: 'lr-001' });
      expect(result).toBe(true);
    });

    it('should return false when no record is deleted', async () => {
      mockQb.delete = jest.fn().mockResolvedValue(0);

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('toLeaveRequest (via findById)', () => {
    it('should handle null managerId, managerComment, submittedAt, reviewedAt', async () => {
      const row = makeRow();
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findById('lr-001');

      expect(result!.managerId).toBeNull();
      expect(result!.managerComment).toBeNull();
      expect(result!.submittedAt).toBeNull();
      expect(result!.reviewedAt).toBeNull();
    });

    it('should parse date fields correctly when present', async () => {
      const row = makeRow({
        managerId: 'mgr-001',
        managerComment: 'Looks good',
        submittedAt: '2026-07-20T10:00:00.000Z',
        reviewedAt: '2026-07-21T15:00:00.000Z',
      });
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findById('lr-001');

      expect(result!.managerId).toBe('mgr-001');
      expect(result!.managerComment).toBe('Looks good');
      expect(result!.submittedAt).toEqual(new Date('2026-07-20T10:00:00.000Z'));
      expect(result!.reviewedAt).toEqual(new Date('2026-07-21T15:00:00.000Z'));
    });
  });
});
