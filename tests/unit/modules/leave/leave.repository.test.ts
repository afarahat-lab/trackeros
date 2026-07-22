import { KnexLeaveRepository, ILeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveRequestStatus } from '../../../../src/modules/leave/leave.model';

jest.mock('knex', () => {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    del: jest.fn(),
    returning: jest.fn(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  };

  const mockKnex = jest.fn(() => mockQueryBuilder);
  (mockKnex as unknown as Record<string, unknown>).QueryBuilder = class {};
  return { knex: mockKnex, Knex: { QueryBuilder: class {} } };
});

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { connect: jest.fn(), end: jest.fn() },
}));

const mockDb = (() => {
  const knexModule = require('knex');
  return knexModule.knex({ client: 'pg' });
})();

function mockChainReturn(value: unknown): void {
  const qb = mockDb;
  (qb.returning as jest.Mock).mockReturnValue(value);
  (qb.first as jest.Mock).mockResolvedValue(value);
  (qb.del as jest.Mock).mockResolvedValue(1);
  (qb as unknown as Record<string, unknown>).then = undefined;
}

function mockQueryBuilderResolve(value: unknown): void {
  const qb = mockDb;
  // Make the query builder thenable so it can be awaited directly
  (qb as unknown as Record<string, unknown>).then = (resolve: (v: unknown) => void) => resolve(value);
}

describe('KnexLeaveRepository', () => {
  let repo: ILeaveRepository;

  const sampleRow = {
    id: 'lr-001',
    employee_id: 'emp-001',
    leave_type_id: 'lt-001',
    start_date: '2026-08-01',
    end_date: '2026-08-05',
    days_requested: 5,
    reason: 'Vacation',
    status: 'DRAFT',
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    cancelled_by: null,
    cancelled_at: null,
    created_at: '2026-07-22T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z',
  };

  const sampleLeaveRequest = {
    id: 'lr-001',
    employeeId: 'emp-001',
    leaveTypeId: 'lt-001',
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    daysRequested: 5,
    reason: 'Vacation',
    status: LeaveRequestStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new KnexLeaveRepository();
  });

  describe('findById', () => {
    it('should return a LeaveRequest when found', async () => {
      mockChainReturn(sampleRow);

      const result = await repo.findById('lr-001');

      expect(result).toEqual(sampleLeaveRequest);
      expect(mockDb.where).toHaveBeenCalledWith({ id: 'lr-001' });
    });

    it('should return null when not found', async () => {
      mockChainReturn(null);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for an employee', async () => {
      mockQueryBuilderResolve([sampleRow]);

      const result = await repo.findByEmployeeId('emp-001', {});

      expect(result).toEqual([sampleLeaveRequest]);
      expect(mockDb.where).toHaveBeenCalledWith({ employee_id: 'emp-001' });
    });

    it('should apply query filters', async () => {
      mockQueryBuilderResolve([sampleRow]);

      await repo.findByEmployeeId('emp-001', {
        status: LeaveRequestStatus.SUBMITTED,
        limit: 10,
        offset: 0,
      });

      expect(mockDb.where).toHaveBeenCalledWith({ status: 'SUBMITTED' });
      expect(mockDb.limit).toHaveBeenCalledWith(10);
      expect(mockDb.offset).toHaveBeenCalledWith(0);
    });
  });

  describe('create', () => {
    it('should create a new leave request with DRAFT status', async () => {
      const dto = {
        employeeId: 'emp-001',
        leaveTypeId: 'lt-001',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        reason: 'Vacation',
      };
      mockChainReturn([sampleRow]);

      const result = await repo.create(dto);

      expect(result).toEqual(sampleLeaveRequest);
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-001',
          leave_type_id: 'lt-001',
          start_date: '2026-08-01',
          end_date: '2026-08-05',
          reason: 'Vacation',
          status: 'DRAFT',
          days_requested: 0,
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a leave request and return the updated record', async () => {
      const updatedRow = { ...sampleRow, reason: 'Updated reason' };
      mockChainReturn([updatedRow]);

      const result = await repo.update('lr-001', { reason: 'Updated reason' });

      expect(result).not.toBeNull();
      expect(result?.reason).toBe('Updated reason');
      expect(mockDb.where).toHaveBeenCalledWith({ id: 'lr-001' });
    });

    it('should return null when record does not exist', async () => {
      mockChainReturn([]);

      const result = await repo.update('nonexistent', { reason: 'Test' });

      expect(result).toBeNull();
    });

    it('should only update provided fields', async () => {
      mockChainReturn([sampleRow]);

      await repo.update('lr-001', { startDate: '2026-09-01' });

      const updateCall = (mockDb.update as jest.Mock).mock.calls[0][0];
      expect(updateCall).toHaveProperty('start_date', '2026-09-01');
      expect(updateCall).toHaveProperty('updated_at');
      expect(updateCall).not.toHaveProperty('end_date');
      expect(updateCall).not.toHaveProperty('reason');
    });
  });

  describe('delete', () => {
    it('should delete a leave request', async () => {
      mockChainReturn(1);

      await repo.delete('lr-001');

      expect(mockDb.where).toHaveBeenCalledWith({ id: 'lr-001' });
      expect(mockDb.del).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all leave requests matching filters', async () => {
      mockQueryBuilderResolve([sampleRow]);

      const result = await repo.findAll({
        status: LeaveRequestStatus.DRAFT,
        leaveTypeId: 'lt-001',
        startDateFrom: '2026-01-01',
        startDateTo: '2026-12-31',
        endDateFrom: '2026-01-01',
        endDateTo: '2026-12-31',
        limit: 20,
        offset: 0,
      });

      expect(result).toEqual([sampleLeaveRequest]);
      expect(mockDb.where).toHaveBeenCalledWith({ status: 'DRAFT' });
      expect(mockDb.where).toHaveBeenCalledWith({ leave_type_id: 'lt-001' });
      expect(mockDb.where).toHaveBeenCalledWith('start_date', '>=', '2026-01-01');
      expect(mockDb.where).toHaveBeenCalledWith('start_date', '<=', '2026-12-31');
      expect(mockDb.where).toHaveBeenCalledWith('end_date', '>=', '2026-01-01');
      expect(mockDb.where).toHaveBeenCalledWith('end_date', '<=', '2026-12-31');
      expect(mockDb.limit).toHaveBeenCalledWith(20);
      expect(mockDb.offset).toHaveBeenCalledWith(0);
    });

    it('should return empty array when no records match', async () => {
      mockQueryBuilderResolve([]);

      const result = await repo.findAll({});

      expect(result).toEqual([]);
    });
  });
});
