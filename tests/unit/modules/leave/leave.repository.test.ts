import { PostgresLeaveRepository } from '../../../../src/modules/leave/leave.repository';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../../src/modules/leave/leave.model';
import { pool } from '../../../../src/shared/db/connection';
import { LeaveType, LeaveStatus } from '../../../../src/shared/types/index';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('PostgresLeaveRepository', () => {
  let repo: PostgresLeaveRepository;

  beforeEach(() => {
    repo = new PostgresLeaveRepository();
    jest.clearAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  const sampleRow = {
    id: 1,
    employee_id: 100,
    leave_type: 'annual',
    start_date: new Date('2026-07-01'),
    end_date: new Date('2026-07-05'),
    reason: 'Vacation',
    status: 'pending',
    submitted_at: null,
    reviewed_by: null,
    reviewed_at: null,
    comments: null,
    manager_id: 200,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const sampleLeaveRequest: LeaveRequest = {
    id: 1,
    employeeId: 100,
    leaveType: LeaveType.Annual,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-05'),
    reason: 'Vacation',
    status: LeaveStatus.Pending,
    submittedAt: null,
    reviewedBy: null,
    reviewedAt: null,
    comments: null,
    managerId: 200,
    createdAt: sampleRow.created_at,
    updatedAt: sampleRow.updated_at,
  };

  const createDto: CreateLeaveRequestDto = {
    employeeId: 100,
    leaveType: LeaveType.Annual,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-05'),
    reason: 'Vacation',
    managerId: 200,
  };

  describe('create', () => {
    it('should insert a leave request and audit log in a transaction', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [sampleRow] }) // INSERT leave_requests
        .mockResolvedValueOnce(undefined) // INSERT audit_log
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repo.create(createDto, 999);
      expect(result).toEqual(sampleLeaveRequest);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO leave_requests'), expect.any(Array));
      expect(mockClient.query).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO audit_log'), expect.any(Array));
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // INSERT fails

      await expect(repo.create(createDto, 999)).rejects.toThrow('Failed to create leave request: DB error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a leave request if found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repo.findById(1);
      expect(result).toEqual(sampleLeaveRequest);
    });

    it('should return null if not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await repo.findById(999);
      expect(result).toBeNull();
    });

    it('should throw on database error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.findById(1)).rejects.toThrow('Failed to find leave request by id: DB error');
    });
  });

  describe('update', () => {
    it('should update fields and insert audit log', async () => {
      const updatedRow = { ...sampleRow, status: 'approved', reviewed_by: 999, reviewed_at: new Date() };
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [sampleRow] }) // SELECT current
        .mockResolvedValueOnce({ rows: [updatedRow] }) // UPDATE
        .mockResolvedValueOnce(undefined) // INSERT audit_log
        .mockResolvedValueOnce(undefined); // COMMIT

      const updates = { status: LeaveStatus.Approved, reviewedBy: 999 };
      const result = await repo.update(1, updates, 999);
      expect(result.status).toBe(LeaveStatus.Approved);
      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.query).toHaveBeenNthCalledWith(3, expect.stringContaining('UPDATE leave_requests'), expect.any(Array));
      expect(mockClient.query).toHaveBeenNthCalledWith(4, expect.stringContaining('INSERT INTO audit_log'), expect.any(Array));
    });

    it('should throw if leave request not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT current

      await expect(repo.update(1, { status: LeaveStatus.Approved }, 999)).rejects.toThrow('Leave request not found');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [sampleRow] }) // SELECT current
        .mockRejectedValueOnce(new Error('DB error')); // UPDATE fails

      await expect(repo.update(1, { status: LeaveStatus.Approved }, 999)).rejects.toThrow('Failed to update leave request: DB error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('delete', () => {
    it('should delete and insert audit log', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [sampleRow] }) // SELECT current
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce(undefined) // INSERT audit_log
        .mockResolvedValueOnce(undefined); // COMMIT

      await repo.delete(1, 999);
      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.query).toHaveBeenNthCalledWith(3, expect.stringContaining('DELETE FROM leave_requests'), [1]);
      expect(mockClient.query).toHaveBeenNthCalledWith(4, expect.stringContaining('INSERT INTO audit_log'), expect.any(Array));
    });

    it('should throw if leave request not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT current

      await expect(repo.delete(1, 999)).rejects.toThrow('Leave request not found');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [sampleRow] }) // SELECT current
        .mockRejectedValueOnce(new Error('DB error')); // DELETE fails

      await expect(repo.delete(1, 999)).rejects.toThrow('Failed to delete leave request: DB error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('findByEmployeeId', () => {
    it('should return leave requests for employee', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repo.findByEmployeeId(100);
      expect(result).toEqual([sampleLeaveRequest]);
    });

    it('should throw on error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.findByEmployeeId(100)).rejects.toThrow('Failed to find leave requests by employee id: DB error');
    });
  });

  describe('findByManagerId', () => {
    it('should return leave requests for manager', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repo.findByManagerId(200);
      expect(result).toEqual([sampleLeaveRequest]);
    });

    it('should throw on error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.findByManagerId(200)).rejects.toThrow('Failed to find leave requests by manager id: DB error');
    });
  });

  describe('findByStatus', () => {
    it('should return leave requests by status', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [sampleRow] });
      const result = await repo.findByStatus(LeaveStatus.Pending);
      expect(result).toEqual([sampleLeaveRequest]);
    });

    it('should throw on error', async () => {
      (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
      await expect(repo.findByStatus(LeaveStatus.Pending)).rejects.toThrow('Failed to find leave requests by status: DB error');
    });
  });
});
