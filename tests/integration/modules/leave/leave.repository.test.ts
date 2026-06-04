import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { PostgresLeaveRepository } from '../../../src/modules/leave/leave.repository';
import { LeaveStatus } from '../../../src/shared/types/index';

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Leave Repository Integration', () => {
  let repository: PostgresLeaveRepository;
  let pool: jest.Mocked<Pool>;

  beforeEach(() => {
    pool = new Pool() as jest.Mocked<Pool>;
    repository = new PostgresLeaveRepository(pool);
  });

  describe('createRequest', () => {
    it('should create a leave request', async () => {
      const dto = {
        employeeId: 'emp123',
        leaveType: 'Sick',
        startDate: new Date(),
        endDate: new Date(),
        reason: 'Medical',
      };
      const mockLeaveRequest = { ...dto, id: '1', status: LeaveStatus.Pending, managerId: 'mgr123' };
      pool.query.mockResolvedValueOnce({ rows: [mockLeaveRequest] });

      const result = await repository.createRequest(dto);

      expect(pool.query).toHaveBeenCalledWith(
        `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [dto.employeeId, dto.leaveType, dto.startDate, dto.endDate, dto.reason, LeaveStatus.Pending]
      );
      expect(result).toEqual(mockLeaveRequest);
    });
  });

  describe('findById', () => {
    it('should find a leave request by id', async () => {
      const mockLeaveRequest = { id: '1', employeeId: 'emp123', leaveType: 'Sick', status: LeaveStatus.Pending, startDate: new Date(), endDate: new Date(), reason: 'Medical', managerId: 'mgr123' };
      pool.query.mockResolvedValueOnce({ rows: [mockLeaveRequest] });

      const result = await repository.findById('1');

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM leave_requests WHERE id = $1', ['1']);
      expect(result).toEqual(mockLeaveRequest);
    });

    it('should return null if no leave request is found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('non-existent-id');

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM leave_requests WHERE id = $1', ['non-existent-id']);
      expect(result).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should find leave requests by employee id', async () => {
      const mockLeaveRequests = [{ id: '1', employeeId: 'emp123', leaveType: 'Sick', status: LeaveStatus.Pending, startDate: new Date(), endDate: new Date(), reason: 'Medical', managerId: 'mgr123' }];
      pool.query.mockResolvedValueOnce({ rows: mockLeaveRequests });

      const result = await repository.findByEmployeeId('emp123');

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM leave_requests WHERE employee_id = $1', ['emp123']);
      expect(result).toEqual(mockLeaveRequests);
    });
  });

  describe('findPendingByManagerId', () => {
    it('should find pending leave requests by manager id', async () => {
      const mockLeaveRequests = [{ id: '1', employeeId: 'emp123', leaveType: 'Sick', status: LeaveStatus.Pending, startDate: new Date(), endDate: new Date(), reason: 'Medical', managerId: 'mgr123' }];
      pool.query.mockResolvedValueOnce({ rows: mockLeaveRequests });

      const result = await repository.findPendingByManagerId('mgr123');

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM leave_requests WHERE manager_id = $1 AND status = $2', ['mgr123', LeaveStatus.Pending]);
      expect(result).toEqual(mockLeaveRequests);
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a leave request', async () => {
      pool.query.mockResolvedValueOnce({});

      await repository.updateStatus('1', LeaveStatus.Approved);

      expect(pool.query).toHaveBeenCalledWith('UPDATE leave_requests SET status = $1 WHERE id = $2', [LeaveStatus.Approved, '1']);
    });
  });
});
