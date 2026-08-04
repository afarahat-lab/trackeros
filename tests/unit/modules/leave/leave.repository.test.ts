import { LeaveRepository } from 'modules/leave/leave.repository';
import { pool } from 'shared/db/connection';
import { LeaveStatus } from 'shared/types/index';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lr-1',
    employee_id: 'emp-1',
    leave_type_id: 'lt-1',
    start_date: new Date('2025-07-01'),
    end_date: new Date('2025-07-05'),
    reason: 'Vacation',
    status: 'DRAFT',
    approved_by: null,
    approved_at: null,
    created_at: new Date('2025-06-15T09:00:00Z'),
    updated_at: new Date('2025-06-15T09:00:00Z'),
    ...overrides,
  };
}

function makeLeaveRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lr-1',
    employeeId: 'emp-1',
    leaveTypeId: 'lt-1',
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-07-05'),
    reason: 'Vacation',
    status: LeaveStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2025-06-15T09:00:00Z'),
    updatedAt: new Date('2025-06-15T09:00:00Z'),
    ...overrides,
  };
}

describe('LeaveRepository', () => {
  let repo: LeaveRepository;

  beforeEach(() => {
    repo = new LeaveRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('returns a leave request when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-1');

      expect(result).toEqual(makeLeaveRequest());
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-1'],
      );
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('propagates database errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findById('lr-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEmployee', () => {
    it('returns leave requests for an employee', async () => {
      const row1 = makeRow({ id: 'lr-1' });
      const row2 = makeRow({ id: 'lr-2' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findByEmployee('emp-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makeLeaveRequest({ id: 'lr-1' }));
      expect(result[1]).toEqual(makeLeaveRequest({ id: 'lr-2' }));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE lr.employee_id = $1'),
        ['emp-1'],
      );
    });

    it('returns an empty array when no requests exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployee('emp-empty');

      expect(result).toEqual([]);
    });

    it('applies query filters when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findByEmployee('emp-1', {
        status: LeaveStatus.APPROVED,
        limit: 10,
        offset: 0,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('lr.status = $2'),
        ['emp-1', 'APPROVED', 10, 0],
      );
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout'));

      await expect(repo.findByEmployee('emp-1')).rejects.toThrow('timeout');
    });
  });

  describe('findByApprover', () => {
    it('returns leave requests for employees under a manager', async () => {
      const row = makeRow({ id: 'lr-1' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByApprover('mgr-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(makeLeaveRequest());
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('e.manager_id = $1'),
        ['mgr-1'],
      );
    });

    it('returns an empty array when no requests exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByApprover('mgr-empty');

      expect(result).toEqual([]);
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('disk full'));

      await expect(repo.findByApprover('mgr-1')).rejects.toThrow('disk full');
    });
  });

  describe('create', () => {
    it('persists a new leave request and returns the created entity', async () => {
      const input = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-05'),
        reason: 'Vacation',
      };

      const returnedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(input);

      expect(result).toEqual(makeLeaveRequest());
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        ['emp-1', 'lt-1', new Date('2025-07-01'), new Date('2025-07-05'), 'Vacation', LeaveStatus.DRAFT],
      );
    });

    it('handles undefined reason by passing null', async () => {
      const input = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-05'),
      };

      const returnedRow = makeRow({ reason: null });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(input);

      expect(result.reason).toBeUndefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        ['emp-1', 'lt-1', new Date('2025-07-01'), new Date('2025-07-05'), null, LeaveStatus.DRAFT],
      );
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('foreign key violation'));

      const input = {
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-05'),
      };

      await expect(repo.create(input)).rejects.toThrow('foreign key violation');
    });
  });

  describe('updateStatus', () => {
    it('updates status and returns the updated leave request', async () => {
      const updatedRow = makeRow({ status: 'APPROVED', approved_by: 'mgr-1', approved_at: new Date('2025-06-16') });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.APPROVED, 'mgr-1', new Date('2025-06-16'));

      expect(result).toEqual(makeLeaveRequest({
        status: LeaveStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2025-06-16'),
      }));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET'),
        ['APPROVED', 'mgr-1', new Date('2025-06-16'), 'lr-1'],
      );
    });

    it('updates status without approvedBy/approvedAt', async () => {
      const updatedRow = makeRow({ status: 'CANCELLED' });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.CANCELLED);

      expect(result).toEqual(makeLeaveRequest({ status: LeaveStatus.CANCELLED }));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET'),
        ['CANCELLED', 'lr-1'],
      );
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus('nonexistent', LeaveStatus.APPROVED);

      expect(result).toBeNull();
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('check constraint violation'));

      await expect(repo.updateStatus('lr-1', LeaveStatus.APPROVED)).rejects.toThrow('check constraint');
    });
  });

  describe('update', () => {
    it('applies only supplied mutable fields and returns the updated leave request', async () => {
      const updatedRow = makeRow({ start_date: new Date('2025-08-01'), end_date: new Date('2025-08-05') });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('lr-1', {
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-05'),
      });

      expect(result).toEqual(makeLeaveRequest({
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-05'),
      }));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET'),
        [new Date('2025-08-01'), new Date('2025-08-05'), 'lr-1'],
      );
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { reason: 'Updated reason' });

      expect(result).toBeNull();
    });

    it('returns the existing leave request when no mutable fields are supplied', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lr-1', {});

      expect(result).toEqual(makeLeaveRequest());
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-1'],
      );
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('permission denied'));

      await expect(repo.update('lr-1', { reason: 'X' })).rejects.toThrow('permission denied');
    });
  });
});
