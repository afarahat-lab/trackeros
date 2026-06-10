import { describe, it, expect, vi } from 'vitest';
import { LeaveRepository } from '../../../src/modules/leave/leave.repository';
import pool from '../../../src/shared/db/connection';

vi.mock('../../../src/shared/db/connection');

const leaveRepository = new LeaveRepository();

describe('SC-2: LeaveRepository CRUD Operations', () => {
  const mockLeaveRequest = {
    id: '1',
    employeeId: 'emp-123',
    leaveType: 'sick',
    startDate: new Date(),
    endDate: new Date(),
    status: 'pending'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a leave request', async () => {
    const dto = { employeeId: 'emp-123', leaveType: 'sick', startDate: new Date(), endDate: new Date(), status: 'pending' };
    (pool.query as vi.Mock).mockResolvedValueOnce({ rows: [mockLeaveRequest] });

    const result = await leaveRepository.create(dto);
    expect(result).toEqual(mockLeaveRequest);
    expect(pool.query).toHaveBeenCalledWith(
      'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [dto.employeeId, dto.leaveType, dto.startDate, dto.endDate, dto.status]
    );
  });

  it('should retrieve a leave request by ID', async () => {
    (pool.query as vi.Mock).mockResolvedValueOnce({ rows: [mockLeaveRequest] });

    const result = await leaveRepository.getById('1');
    expect(result).toEqual(mockLeaveRequest);
  });

  it('should return null if leave request not found', async () => {
    (pool.query as vi.Mock).mockResolvedValueOnce({ rows: [] });

    const result = await leaveRepository.getById('non-existent-id');
    expect(result).toBeNull();
  });

  it('should update an existing leave request', async () => {
    const updateDto = { status: 'approved' };
    const updatedLeaveRequest = { ...mockLeaveRequest, ...updateDto };
    (pool.query as vi.Mock).mockResolvedValueOnce({ rows: [updatedLeaveRequest] });

    const result = await leaveRepository.update('1', updateDto);
    expect(result).toEqual(updatedLeaveRequest);
  });

  it('should return null if leave request to update not found', async () => {
    (pool.query as vi.Mock).mockResolvedValueOnce({ rows: [] });

    const result = await leaveRepository.update('non-existent-id', { status: 'approved' });
    expect(result).toBeNull();
  });

  it('should delete a leave request by ID', async () => {
    (pool.query as vi.Mock).mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const result = await leaveRepository.delete('1');
    expect(result).toEqual({ message: 'Leave request deleted successfully' });
  });

  it('should handle deletion of non-existent leave request', async () => {
    (pool.query as vi.Mock).mockResolvedValueOnce({ rows: [] });

    const result = await leaveRepository.delete('non-existent-id');
    expect(result).toEqual({ message: 'Leave request not found' });
  });
});