
import { PgLeaveRequestRepository } from '../../../../src/modules/leave-request/leave-request.repository';
import { LeaveRequest } from '../../../../src/modules/leave-request/leave-request.model';
import { LeaveRequestStatus } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

function makeLeaveRequestRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const now = new Date();
  return {
    id: 'lr-001',
    employee_id: 'emp-001',
    leave_type_id: 'lt-001',
    leave_policy_id: 'lp-001',
    start_date: new Date('2026-08-10'),
    end_date: new Date('2026-08-14'),
    days_count: 5,
    reason: 'Vacation',
    status: 'DRAFT',
    approved_by: null,
    approved_at: null,
    cancelled_by: null,
    cancelled_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  const now = new Date();
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leaveTypeId: 'lt-001',
    leavePolicyId: 'lp-001',
    startDate: new Date('2026-08-10'),
    endDate: new Date('2026-08-14'),
    daysCount: 5,
    reason: 'Vacation',
    status: LeaveRequestStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('PgLeaveRequestRepository', () => {
  let repo: PgLeaveRequestRepository;
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    repo = new PgLeaveRequestRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      const row = makeLeaveRequestRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('lr-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-001']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-001');
      expect(result!.employeeId).toBe('emp-001');
      expect(result!.leaveTypeId).toBe('lt-001');
      expect(result!.leavePolicyId).toBe('lp-001');
      expect(result!.daysCount).toBe(5);
      expect(result!.reason).toBe('Vacation');
      expect(result!.status).toBe(LeaveRequestStatus.DRAFT);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.cancelledBy).toBeNull();
      expect(result!.cancelledAt).toBeNull();
    });

    it('should return null when request is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123, employee_id: 'emp-001' }], rowCount: 1 });

      const result = await repo.findById('lr-001');

      expect(result).toBeNull();
    });

    it('should return null when row has invalid status', async () => {
      const row = makeLeaveRequestRow({ status: 'INVALID_STATUS' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('lr-001');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repo.findById('lr-001')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmployeeId', () => {
    it('should return all requests for an employee', async () => {
      const row1 = makeLeaveRequestRow({ id: 'lr-001' });
      const row2 = makeLeaveRequestRow({ id: 'lr-002', status: 'SUBMITTED' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findByEmployeeId('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1',
        ['emp-001']
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-001');
      expect(result[1].id).toBe('lr-002');
      expect(result[1].status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should return an empty array when no requests found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEmployeeId('emp-999');

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeLeaveRequestRow({ id: 'lr-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findByEmployeeId('emp-001');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findByEmployeeId('emp-001')).rejects.toThrow('query failed');
    });
  });

  describe('findByEmployeeAndStatus', () => {
    it('should return requests matching employee and status', async () => {
      const row = makeLeaveRequestRow({ id: 'lr-001', status: 'SUBMITTED' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findByEmployeeAndStatus('emp-001', LeaveRequestStatus.SUBMITTED);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = $2',
        ['emp-001', LeaveRequestStatus.SUBMITTED]
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
      expect(result[0].status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should return an empty array when no matching requests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEmployeeAndStatus('emp-001', LeaveRequestStatus.APPROVED);

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeLeaveRequestRow({ id: 'lr-001', status: 'SUBMITTED' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findByEmployeeAndStatus('emp-001', LeaveRequestStatus.SUBMITTED);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(
        repo.findByEmployeeAndStatus('emp-001', LeaveRequestStatus.SUBMITTED)
      ).rejects.toThrow('query failed');
    });
  });

  describe('findOverlapping', () => {
    it('should return overlapping requests using inclusive overlap', async () => {
      const row = makeLeaveRequestRow({
        id: 'lr-001',
        start_date: new Date('2026-08-10'),
        end_date: new Date('2026-08-14'),
      });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findOverlapping(
        'emp-001',
        new Date('2026-08-12'),
        new Date('2026-08-16')
      );

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT * FROM leave_requests
       WHERE employee_id = $1
         AND start_date <= $3
         AND end_date >= $2`,
        ['emp-001', new Date('2026-08-12'), new Date('2026-08-16')]
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
    });

    it('should return an empty array when no overlapping requests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findOverlapping(
        'emp-001',
        new Date('2026-08-01'),
        new Date('2026-08-05')
      );

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(
        repo.findOverlapping('emp-001', new Date('2026-08-01'), new Date('2026-08-05'))
      ).rejects.toThrow('query failed');
    });
  });

  describe('findPendingByManagerId', () => {
    it('should return pending requests for direct reports of a manager', async () => {
      const row = makeLeaveRequestRow({ id: 'lr-001', status: 'SUBMITTED' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findPendingByManagerId('mgr-001');

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT lr.* FROM leave_requests lr
       INNER JOIN employees e ON lr.employee_id = e.id
       WHERE e.manager_id = $1 AND lr.status = $2`,
        ['mgr-001', LeaveRequestStatus.SUBMITTED]
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
      expect(result[0].status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should return an empty array when no pending requests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findPendingByManagerId('mgr-999');

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeLeaveRequestRow({ id: 'lr-001', status: 'SUBMITTED' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findPendingByManagerId('mgr-001');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findPendingByManagerId('mgr-001')).rejects.toThrow('query failed');
    });
  });

  describe('findAll', () => {
    it('should return all requests matching filters', async () => {
      const row = makeLeaveRequestRow({ id: 'lr-001', status: 'SUBMITTED' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findAll({ status: LeaveRequestStatus.SUBMITTED });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1',
        [LeaveRequestStatus.SUBMITTED]
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
    });

    it('should return all requests when no filters provided', async () => {
      const row1 = makeLeaveRequestRow({ id: 'lr-001' });
      const row2 = makeLeaveRequestRow({ id: 'lr-002' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findAll({});

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests ',
        []
      );
      expect(result).toHaveLength(2);
    });

    it('should handle multiple filters', async () => {
      const row = makeLeaveRequestRow({ id: 'lr-001', status: 'SUBMITTED', leave_type_id: 'lt-001' });
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findAll({
        employeeId: 'emp-001',
        status: LeaveRequestStatus.SUBMITTED,
        leaveTypeId: 'lt-001',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 AND status = $2 AND leave_type_id = $3',
        ['emp-001', LeaveRequestStatus.SUBMITTED, 'lt-001']
      );
      expect(result).toHaveLength(1);
    });

    it('should return an empty array when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findAll({ status: LeaveRequestStatus.APPROVED });

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeLeaveRequestRow({ id: 'lr-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findAll({});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findAll({})).rejects.toThrow('query failed');
    });
  });

  describe('create', () => {
    it('should create a leave request and return it', async () => {
      const input = {
        employeeId: 'emp-002',
        leaveTypeId: 'lt-001',
        leavePolicyId: 'lp-001',
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-14'),
        daysCount: 5,
        reason: 'Personal',
        status: LeaveRequestStatus.DRAFT,
        approvedBy: null,
        approvedAt: null,
        cancelledBy: null,
        cancelledAt: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [makeLeaveRequestRow({
          id: 'generated-id',
          employee_id: 'emp-002',
          leave_type_id: 'lt-001',
          leave_policy_id: 'lp-001',
          start_date: new Date('2026-08-10'),
          end_date: new Date('2026-08-14'),
          days_count: 5,
          reason: 'Personal',
          status: 'DRAFT',
          approved_by: null,
          approved_at: null,
          cancelled_by: null,
          cancelled_at: null,
        })],
        rowCount: 1,
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('INSERT INTO leave_requests');
      expect(queryText).toContain('RETURNING *');
      expect(result.employeeId).toBe('emp-002');
      expect(result.leaveTypeId).toBe('lt-001');
      expect(result.leavePolicyId).toBe('lp-001');
      expect(result.daysCount).toBe(5);
      expect(result.reason).toBe('Personal');
      expect(result.status).toBe(LeaveRequestStatus.DRAFT);
      expect(result.approvedBy).toBeNull();
      expect(result.approvedAt).toBeNull();
      expect(result.cancelledBy).toBeNull();
      expect(result.cancelledAt).toBeNull();
    });

    it('should handle undefined reason by storing null', async () => {
      const input = {
        employeeId: 'emp-002',
        leaveTypeId: 'lt-001',
        leavePolicyId: 'lp-001',
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-14'),
        daysCount: 5,
        reason: undefined,
        status: LeaveRequestStatus.DRAFT,
        approvedBy: null,
        approvedAt: null,
        cancelledBy: null,
        cancelledAt: null,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [makeLeaveRequestRow({
          id: 'generated-id',
          employee_id: 'emp-002',
          reason: null,
        })],
        rowCount: 1,
      });

      const result = await repo.create(input);

      expect(result.reason).toBeUndefined();
    });

    it('should throw when insert returns no row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repo.create({
          employeeId: 'emp-003',
          leaveTypeId: 'lt-001',
          leavePolicyId: 'lp-001',
          startDate: new Date('2026-08-10'),
          endDate: new Date('2026-08-14'),
          daysCount: 5,
          reason: 'Test',
          status: LeaveRequestStatus.DRAFT,
          approvedBy: null,
          approvedAt: null,
          cancelledBy: null,
          cancelledAt: null,
        })
      ).rejects.toThrow('Failed to create leave request');
    });

    it('should throw when insert returns invalid row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      await expect(
        repo.create({
          employeeId: 'emp-003',
          leaveTypeId: 'lt-001',
          leavePolicyId: 'lp-001',
          startDate: new Date('2026-08-10'),
          endDate: new Date('2026-08-14'),
          daysCount: 5,
          reason: 'Test',
          status: LeaveRequestStatus.DRAFT,
          approvedBy: null,
          approvedAt: null,
          cancelledBy: null,
          cancelledAt: null,
        })
      ).rejects.toThrow('Failed to create leave request');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('insert failed'));

      await expect(
        repo.create({
          employeeId: 'emp-003',
          leaveTypeId: 'lt-001',
          leavePolicyId: 'lp-001',
          startDate: new Date('2026-08-10'),
          endDate: new Date('2026-08-14'),
          daysCount: 5,
          reason: 'Test',
          status: LeaveRequestStatus.DRAFT,
          approvedBy: null,
          approvedAt: null,
          cancelledBy: null,
          cancelledAt: null,
        })
      ).rejects.toThrow('insert failed');
    });
  });

  describe('update', () => {
    it('should update a leave request and return the updated record', async () => {
      const updatedRow = makeLeaveRequestRow({
        reason: 'Updated reason',
        days_count: 3,
        status: 'SUBMITTED',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.update('lr-001', {
        reason: 'Updated reason',
        daysCount: 3,
        status: LeaveRequestStatus.SUBMITTED,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('UPDATE leave_requests SET');
      expect(queryText).toContain('days_count = $1');
      expect(queryText).toContain('reason = $2');
      expect(queryText).toContain('status = $3');
      expect(queryText).toContain('updated_at = $4');
      expect(queryText).toContain('WHERE id = $5');
      expect(result).not.toBeNull();
      expect(result!.reason).toBe('Updated reason');
      expect(result!.daysCount).toBe(3);
      expect(result!.status).toBe(LeaveRequestStatus.SUBMITTED);
    });

    it('should return null when request is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.update('nonexistent', { reason: 'test' });

      expect(result).toBeNull();
    });

    it('should return current request when no fields are provided', async () => {
      const row = makeLeaveRequestRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.update('lr-001', {});

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM leave_requests WHERE id = $1');
      expect(result).not.toBeNull();
    });

    it('should handle setting reason to null via undefined', async () => {
      const updatedRow = makeLeaveRequestRow({ reason: null });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.update('lr-001', { reason: undefined });

      expect(result).not.toBeNull();
      expect(result!.reason).toBeUndefined();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('update failed'));

      await expect(
        repo.update('lr-001', { reason: 'test' })
      ).rejects.toThrow('update failed');
    });
  });

  describe('updateStatus', () => {
    it('should update status and approval metadata atomically', async () => {
      const approvedAt = new Date('2026-08-05');
      const updatedRow = makeLeaveRequestRow({
        status: 'APPROVED',
        approved_by: 'mgr-001',
        approved_at: approvedAt,
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.updateStatus('lr-001', LeaveRequestStatus.APPROVED, {
        approvedBy: 'mgr-001',
        approvedAt,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('UPDATE leave_requests SET');
      expect(queryText).toContain('status = $1');
      expect(queryText).toContain('updated_at = $2');
      expect(queryText).toContain('approved_by = $3');
      expect(queryText).toContain('approved_at = $4');
      expect(queryText).toContain('WHERE id = $5');
      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result!.approvedBy).toBe('mgr-001');
      expect(result!.approvedAt).toEqual(approvedAt);
    });

    it('should update status and cancellation metadata atomically', async () => {
      const cancelledAt = new Date('2026-08-05');
      const updatedRow = makeLeaveRequestRow({
        status: 'CANCELLED',
        cancelled_by: 'emp-001',
        cancelled_at: cancelledAt,
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const result = await repo.updateStatus('lr-001', LeaveRequestStatus.CANCELLED, {
        cancelledBy: 'emp-001',
        cancelledAt,
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(result!.cancelledBy).toBe('emp-001');
      expect(result!.cancelledAt).toEqual(cancelledAt);
    });

    it('should return null when request is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.updateStatus('nonexistent', LeaveRequestStatus.APPROVED, {
        approvedBy: 'mgr-001',
        approvedAt: new Date(),
      });

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('update failed'));

      await expect(
        repo.updateStatus('lr-001', LeaveRequestStatus.APPROVED, {
          approvedBy: 'mgr-001',
          approvedAt: new Date(),
        })
      ).rejects.toThrow('update failed');
    });
  });
});
