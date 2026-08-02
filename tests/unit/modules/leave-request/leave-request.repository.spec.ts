import { LeaveRequestRepository } from '../../../../src/modules/leave-request/leave-request.repository';
import { LeaveStatus } from '../../../../src/shared/types/index';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'lr-1',
    employee_id: 'emp-1',
    leave_type_id: 'lt-annual',
    start_date: '2024-06-01T00:00:00.000Z',
    end_date: '2024-06-05T00:00:00.000Z',
    reason: 'Vacation',
    rejection_reason: null,
    status: 'SUBMITTED',
    approved_by: null,
    approved_at: null,
    cancelled_at: null,
    created_at: '2024-05-15T00:00:00.000Z',
    updated_at: '2024-05-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('LeaveRequestRepository', () => {
  let repo: LeaveRequestRepository;

  beforeEach(() => {
    repo = new LeaveRequestRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-1');
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.leaveTypeId).toBe('lt-annual');
      expect(result!.startDate).toBeInstanceOf(Date);
      expect(result!.endDate).toBeInstanceOf(Date);
      expect(result!.reason).toBe('Vacation');
      expect(result!.rejectionReason).toBeUndefined();
      expect(result!.status).toBe(LeaveStatus.SUBMITTED);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.cancelledAt).toBeNull();
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-1'],
      );
    });

    it('should return null when leave request not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findById('lr-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmployee', () => {
    it('should return requests for a given employee ordered by created_at DESC', async () => {
      const row1 = makeRow({ id: 'lr-1', created_at: '2024-05-15T00:00:00.000Z' });
      const row2 = makeRow({ id: 'lr-2', created_at: '2024-06-01T00:00:00.000Z' });
      mockQuery.mockResolvedValueOnce({ rows: [row2, row1] });

      const result = await repo.findByEmployee('emp-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-2');
      expect(result[1].id).toBe('lr-1');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
        ['emp-1'],
      );
    });

    it('should return an empty array when no requests exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployee('emp-empty');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findByEmployee('emp-1')).rejects.toThrow('db error');
    });
  });

  describe('findByStatus', () => {
    it('should return requests with the given status', async () => {
      const row = makeRow({ status: 'APPROVED' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByStatus(LeaveStatus.APPROVED);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveStatus.APPROVED);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE status = $1 ORDER BY created_at DESC',
        [LeaveStatus.APPROVED],
      );
    });

    it('should return an empty array when no requests match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByStatus(LeaveStatus.CANCELLED);

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findByStatus(LeaveStatus.SUBMITTED)).rejects.toThrow('db error');
    });
  });

  describe('findByApprover', () => {
    it('should return requests approved by the given approver', async () => {
      const row = makeRow({ approved_by: 'mgr-1', status: 'APPROVED' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByApprover('mgr-1');

      expect(result).toHaveLength(1);
      expect(result[0].approvedBy).toBe('mgr-1');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE approved_by = $1 ORDER BY created_at DESC',
        ['mgr-1'],
      );
    });

    it('should return an empty array when no requests match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByApprover('mgr-none');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findByApprover('mgr-1')).rejects.toThrow('db error');
    });
  });

  describe('findPendingByManager', () => {
    it('should return submitted requests for employees under the given manager', async () => {
      const row = makeRow({ id: 'lr-1', employee_id: 'emp-1', status: 'SUBMITTED' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findPendingByManager('mgr-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-1');
      expect(result[0].status).toBe(LeaveStatus.SUBMITTED);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN employees e ON lr.employee_id = e.id'),
        ['mgr-1', LeaveStatus.SUBMITTED],
      );
    });

    it('should return an empty array when no pending requests exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findPendingByManager('mgr-empty');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findPendingByManager('mgr-1')).rejects.toThrow('db error');
    });
  });

  describe('create', () => {
    const createInput = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-annual',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-05'),
      reason: 'Vacation',
      rejectionReason: undefined,
      status: LeaveStatus.SUBMITTED,
      approvedBy: null,
      approvedAt: null,
      cancelledAt: null,
    };

    it('should create and return a fully-populated leave request', async () => {
      const returnedRow = makeRow({
        id: 'lr-new',
        employee_id: 'emp-1',
        leave_type_id: 'lt-annual',
        start_date: '2024-06-01T00:00:00.000Z',
        end_date: '2024-06-05T00:00:00.000Z',
        reason: 'Vacation',
        rejection_reason: null,
        status: 'SUBMITTED',
        approved_by: null,
        approved_at: null,
        cancelled_at: null,
        created_at: '2024-05-15T00:00:00.000Z',
        updated_at: '2024-05-15T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(createInput);

      expect(result.id).toBe('lr-new');
      expect(result.employeeId).toBe('emp-1');
      expect(result.leaveTypeId).toBe('lt-annual');
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.reason).toBe('Vacation');
      expect(result.rejectionReason).toBeUndefined();
      expect(result.status).toBe(LeaveStatus.SUBMITTED);
      expect(result.approvedBy).toBeNull();
      expect(result.approvedAt).toBeNull();
      expect(result.cancelledAt).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should propagate unique-constraint violations', async () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(uniqueError);

      await expect(repo.create(createInput)).rejects.toThrow('duplicate key value violates unique constraint');
    });

    it('should propagate general database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.create(createInput)).rejects.toThrow('db error');
    });
  });

  describe('update', () => {
    it('should update only provided fields and return the updated request', async () => {
      const updatedRow = makeRow({
        reason: 'Updated reason',
        rejection_reason: 'Insufficient notice',
        updated_at: '2024-05-16T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('lr-1', {
        reason: 'Updated reason',
        rejectionReason: 'Insufficient notice',
      });

      expect(result).not.toBeNull();
      expect(result!.reason).toBe('Updated reason');
      expect(result!.rejectionReason).toBe('Insufficient notice');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET'),
        expect.arrayContaining(['lr-1', 'Updated reason', 'Insufficient notice']),
      );
    });

    it('should return null when no matching row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { reason: 'New reason' });

      expect(result).toBeNull();
    });

    it('should not allow updating id, createdAt, or updatedAt', async () => {
      const updatedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await repo.update('lr-1', {
        id: 'hacked-id',
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date('2020-01-01'),
        reason: 'Legit',
      });

      const sqlArg = mockQuery.mock.calls[0][0] as string;
      const setClause = sqlArg.match(/SET (.+?) WHERE/s)?.[1] ?? '';
      expect(setClause).not.toContain('id =');
      expect(setClause).not.toContain('created_at');
      expect(setClause).toContain('reason');
      expect(setClause).toContain('updated_at = NOW()');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.update('lr-1', { reason: 'New reason' })).rejects.toThrow('db error');
    });
  });

  describe('updateStatus', () => {
    it('should update status and return the updated request', async () => {
      const updatedRow = makeRow({
        status: 'APPROVED',
        approved_by: 'mgr-1',
        approved_at: '2024-05-16T00:00:00.000Z',
        updated_at: '2024-05-16T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.APPROVED, {
        approvedBy: 'mgr-1',
        approvedAt: new Date('2024-05-16'),
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveStatus.APPROVED);
      expect(result!.approvedBy).toBe('mgr-1');
      expect(result!.approvedAt).toBeInstanceOf(Date);
    });

    it('should update status with rejection reason', async () => {
      const updatedRow = makeRow({
        status: 'REJECTED',
        rejection_reason: 'Not enough notice',
        updated_at: '2024-05-16T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.REJECTED, {
        rejectionReason: 'Not enough notice',
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveStatus.REJECTED);
      expect(result!.rejectionReason).toBe('Not enough notice');
    });

    it('should update status with cancelledAt', async () => {
      const updatedRow = makeRow({
        status: 'CANCELLED',
        cancelled_at: '2024-05-16T00:00:00.000Z',
        updated_at: '2024-05-16T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.CANCELLED, {
        cancelledAt: new Date('2024-05-16'),
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveStatus.CANCELLED);
      expect(result!.cancelledAt).toBeInstanceOf(Date);
    });

    it('should return null when no matching row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus('nonexistent', LeaveStatus.APPROVED);

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.updateStatus('lr-1', LeaveStatus.APPROVED)).rejects.toThrow('db error');
    });
  });
});
