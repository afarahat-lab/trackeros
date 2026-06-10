import { describe, it, expect, vi } from 'vitest';
import { LeaveRepository } from '../../../src/modules/leave/leave.repository';
import { LeaveRequest } from '../../../src/modules/leave/leave.model';

vi.mock('../../shared/db/connection', () => ({
  query: vi.fn(),
}));

const mockDb = require('../../shared/db/connection');
const leaveRepository = new LeaveRepository(mockDb);

describe('SC-2: LeaveRepository CRUD Operations', () => {
  const leaveRequest: LeaveRequest = {
    id: '1',
    employeeId: 'emp-123',
    leaveType: 'SICK',
    startDate: new Date(),
    endDate: new Date(),
    status: 'PENDING',
  };

  it('should create a leave request', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [leaveRequest] });
    const result = await leaveRepository.create(leaveRequest);
    expect(result).toEqual(leaveRequest);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO leave_requests'),
      [leaveRequest.id, leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status]
    );
  });

  it('should find a leave request by ID', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [leaveRequest] });
    const result = await leaveRepository.findById('1');
    expect(result).toEqual(leaveRequest);
  });

  it('should return null if leave request not found', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });
    const result = await leaveRepository.findById('non-existent-id');
    expect(result).toBeNull();
  });

  it('should update an existing leave request', async () => {
    const updatedLeaveRequest = { ...leaveRequest, status: 'APPROVED' };
    mockDb.query.mockResolvedValueOnce({ rows: [updatedLeaveRequest] });
    const result = await leaveRepository.update('1', updatedLeaveRequest);
    expect(result).toEqual(updatedLeaveRequest);
  });

  it('should delete a leave request by ID', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [leaveRequest] });
    const result = await leaveRepository.delete('1');
    expect(result).toEqual(leaveRequest);
  });
});