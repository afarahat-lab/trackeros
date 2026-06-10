import { describe, it, expect, vi } from 'vitest';
import { LeaveRepository } from '../../../src/modules/leave/leave.repository';
import type { CreateLeaveRequestDto, LeaveRequest } from '../../../src/modules/leave/leave.model';

vi.mock('../../shared/db/connection', () => ({
  query: vi.fn()
}));

const mockDb = require('../../shared/db/connection');
const leaveRepository = new LeaveRepository(mockDb);

describe('SC-2: LeaveRepository CRUD Operations', () => {
  const leaveRequestDto: CreateLeaveRequestDto = {
    employeeId: 'emp-123',
    leaveType: 'sick',
    startDate: new Date(),
    endDate: new Date(),
    status: 'pending'
  };

  it('should create a leave request', async () => {
    const mockLeaveRequest: LeaveRequest = { ...leaveRequestDto, id: '1' };
    mockDb.query.mockResolvedValueOnce({ rows: [mockLeaveRequest] });

    const result = await leaveRepository.create(leaveRequestDto);
    expect(result).toEqual(mockLeaveRequest);
    expect(mockDb.query).toHaveBeenCalledWith(
      'INSERT INTO leave_requests (employeeId, leaveType, startDate, endDate, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [leaveRequestDto.employeeId, leaveRequestDto.leaveType, leaveRequestDto.startDate, leaveRequestDto.endDate, leaveRequestDto.status]
    );
  });

  it('should retrieve a leave request by ID', async () => {
    const mockLeaveRequest: LeaveRequest = { ...leaveRequestDto, id: '1' };
    mockDb.query.mockResolvedValueOnce({ rows: [mockLeaveRequest] });

    const result = await leaveRepository.findById('1');
    expect(result).toEqual(mockLeaveRequest);
  });

  it('should return null for a non-existent leave request', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });

    const result = await leaveRepository.findById('non-existent-id');
    expect(result).toBeNull();
  });

  it('should update an existing leave request', async () => {
    const updatedLeaveRequest: LeaveRequest = { ...leaveRequestDto, id: '1', status: 'approved' };
    mockDb.query.mockResolvedValueOnce({ rows: [updatedLeaveRequest] });

    const result = await leaveRepository.update('1', { ...leaveRequestDto, status: 'approved' });
    expect(result).toEqual(updatedLeaveRequest);
  });

  it('should delete a leave request by ID', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });
    await leaveRepository.delete('1');
    expect(mockDb.query).toHaveBeenCalledWith(
      'DELETE FROM leave_requests WHERE id = $1',
      ['1']
    );
  });
});