import { describe, it, expect, vi } from 'vitest';
import { LeaveRepository } from '../../../src/modules/leave/leave.repository';
import pool from '../../../src/shared/db/connection';

vi.mock('../../../src/shared/db/connection');

const leaveRepository = new LeaveRepository();

describe('SC-2: LeaveRepository CRUD Operations', () => {
  const mockLeaveRequest = { id: '1', employeeId: 'emp1', leaveType: 'sick', startDate: new Date(), endDate: new Date(), status: 'pending' };

  it('should create a leave request', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockLeaveRequest] });
    const result = await leaveRepository.create({ employeeId: 'emp1', leaveType: 'sick', startDate: new Date(), endDate: new Date(), status: 'pending' });
    expect(result).toEqual(mockLeaveRequest);
    expect(pool.query).toHaveBeenCalledWith(
      'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['emp1', 'sick', expect.any(Date), expect.any(Date), 'pending']
    );
  });

  it('should retrieve a leave request by ID', async () => {
    pool.query.mockResolvedValueOnce({ rows: [mockLeaveRequest] });
    const result = await leaveRepository.getById('1');
    expect(result).toEqual(mockLeaveRequest);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM leave_requests WHERE id = $1', ['1']);
  });

  it('should update an existing leave request', async () => {
    const updatedRequest = { ...mockLeaveRequest, status: 'approved' };
    pool.query.mockResolvedValueOnce({ rows: [updatedRequest] });
    const result = await leaveRepository.update('1', { status: 'approved' });
    expect(result).toEqual(updatedRequest);
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE leave_requests SET leave_type = $1, start_date = $2, end_date = $3, status = $4 WHERE id = $5 RETURNING *',
      [undefined, undefined, undefined, 'approved', '1']
    );
  });

  it('should delete a leave request by ID', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const result = await leaveRepository.delete('1');
    expect(result).toBeUndefined();
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM leave_requests WHERE id = $1', ['1']);
  });
});