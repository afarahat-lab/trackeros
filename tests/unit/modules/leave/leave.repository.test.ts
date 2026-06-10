import { describe, it, expect, vi } from 'vitest';
import { LeaveRepository } from '../../../src/modules/leave/leave.repository';
import { CreateLeaveRequestDto } from '../../../src/modules/leave/leave.model';

vi.mock('../../shared/db/connection', () => ({
  query: vi.fn()
}));

const mockDb = require('../../shared/db/connection');
const leaveRepository = new LeaveRepository();

describe('SC-2: LeaveRepository CRUD Operations', () => {
  const dto: CreateLeaveRequestDto = {
    employeeId: '123',
    leaveType: 'Sick',
    startDate: new Date(),
    endDate: new Date(),
    status: 'Pending'
  };

  it('should create a leave request successfully', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1', ...dto }] });
    const result = await leaveRepository.create(dto);
    expect(result).toEqual({ id: '1', ...dto });
    expect(mockDb.query).toHaveBeenCalledWith(
      'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [dto.employeeId, dto.leaveType, dto.startDate, dto.endDate, dto.status]
    );
  });

  it('should handle errors during leave request creation', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('Database error'));
    await expect(leaveRepository.create(dto)).rejects.toThrow('Database error');
  });
});