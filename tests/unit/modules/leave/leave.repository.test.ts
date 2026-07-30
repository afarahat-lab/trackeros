import { PgLeaveRequestRepository } from '../../../../src/modules/leave/leave.repository';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveRequestStatus } from '../../../../src/shared/types/index';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

const sampleRow = {
  id: 'req-1',
  employee_id: 'emp-1',
  leave_policy_id: 'pol-1',
  start_date: '2025-06-01T00:00:00.000Z',
  end_date: '2025-06-03T00:00:00.000Z',
  reason: 'vacation',
  status: 'SUBMITTED',
  approved_by: null,
  approved_at: null,
  created_at: '2025-05-20T10:00:00.000Z',
  updated_at: '2025-05-20T10:00:00.000Z',
};

const expectedModel = {
  id: 'req-1',
  employeeId: 'emp-1',
  leavePolicyId: 'pol-1',
  startDate: new Date('2025-06-01T00:00:00.000Z'),
  endDate: new Date('2025-06-03T00:00:00.000Z'),
  reason: 'vacation',
  status: LeaveRequestStatus.SUBMITTED,
  approvedBy: null,
  approvedAt: null,
  createdAt: new Date('2025-05-20T10:00:00.000Z'),
  updatedAt: new Date('2025-05-20T10:00:00.000Z'),
};

describe('PgLeaveRequestRepository', () => {
  let repo: PgLeaveRequestRepository;

  beforeEach(() => {
    repo = new PgLeaveRequestRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a leave request when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repo.findById('req-1');
      expect(result).toEqual(expectedModel);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['req-1']);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw wrapped error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection lost'));
      await expect(repo.findById('req-1')).rejects.toThrow(
        'Failed to find leave request by id: connection lost'
      );
    });
  });

  describe('findByEmployee', () => {
    it('should return an array of leave requests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repo.findByEmployee('emp-1');
      expect(result).toEqual([expectedModel]);
    });

    it('should return empty array when none found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repo.findByEmployee('emp-1');
      expect(result).toEqual([]);
    });

    it('should throw wrapped error on failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout'));
      await expect(repo.findByEmployee('emp-1')).rejects.toThrow(
        'Failed to find leave requests by employee: timeout'
      );
    });
  });

  describe('findByStatus', () => {
    it('should return an array of leave requests with given status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repo.findByStatus(LeaveRequestStatus.SUBMITTED);
      expect(result).toEqual([expectedModel]);
    });

    it('should return empty array when none found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repo.findByStatus(LeaveRequestStatus.APPROVED);
      expect(result).toEqual([]);
    });

    it('should throw wrapped error on failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));
      await expect(repo.findByStatus(LeaveRequestStatus.DRAFT)).rejects.toThrow(
        'Failed to find leave requests by status: db error'
      );
    });
  });

  describe('create', () => {
    const createInput = {
      employeeId: 'emp-1',
      leavePolicyId: 'pol-1',
      startDate: new Date('2025-06-01T00:00:00.000Z'),
      endDate: new Date('2025-06-03T00:00:00.000Z'),
      reason: 'vacation',
      status: LeaveRequestStatus.DRAFT,
      approvedBy: null,
      approvedAt: null,
    };

    it('should insert and return the new leave request', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repo.create(createInput);
      expect(result).toEqual(expectedModel);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [
          'emp-1',
          'pol-1',
          createInput.startDate,
          createInput.endDate,
          'vacation',
          LeaveRequestStatus.DRAFT,
          null,
          null,
        ]
      );
    });

    it('should throw wrapped error on failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('duplicate key'));
      await expect(repo.create(createInput)).rejects.toThrow(
        'Failed to create leave request: duplicate key'
      );
    });
  });

  describe('update', () => {
    it('should update and return the leave request', async () => {
      const updatedRow = { ...sampleRow, status: 'APPROVED', approved_by: 'mgr-1', approved_at: '2025-05-21T00:00:00.000Z' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      const result = await repo.update('req-1', {
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2025-05-21T00:00:00.000Z'),
      });
      expect(result).toEqual({
        ...expectedModel,
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr-1',
        approvedAt: new Date('2025-05-21T00:00:00.000Z'),
      });
    });

    it('should return null when no fields to update', async () => {
      const result = await repo.update('req-1', {});
      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return null when record not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await repo.update('nonexistent', { reason: 'new reason' });
      expect(result).toBeNull();
    });

    it('should throw wrapped error on failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('constraint violation'));
      await expect(repo.update('req-1', { reason: 'x' })).rejects.toThrow(
        'Failed to update leave request: constraint violation'
      );
    });
  });

  describe('mapRowToRequest validation', () => {
    it('should throw on invalid status from database', async () => {
      const badRow = { ...sampleRow, status: 'INVALID' };
      mockQuery.mockResolvedValueOnce({ rows: [badRow] });
      await expect(repo.findById('req-1')).rejects.toThrow(
        'Invalid leave request status from database: INVALID'
      );
    });
  });
});
