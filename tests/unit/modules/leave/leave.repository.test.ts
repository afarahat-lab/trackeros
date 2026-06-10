import { describe, it, expect, vi } from 'vitest';
import { LeaveRepository } from '../../../src/modules/leave/leave.repository';
import { LeaveRequest } from '../../../src/modules/leave/leave.model';

// Mock the database connection
vi.mock('../../shared/db/connection', () => ({
  query: vi.fn(),
}));

const mockDb = require('../../shared/db/connection');
const leaveRepository = new LeaveRepository(mockDb);

describe('SC-2: LeaveRepository CRUD Operations', () => {
  const leaveRequest: LeaveRequest = {
    id: '1',
    employeeId: 'emp-123',
    leaveType: 'Sick',
    startDate: new Date(),
    endDate: new Date(),
    status: 'Pending',
  };

  it('should create a new leave request', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [leaveRequest] });
    const result = await leaveRepository.create(leaveRequest);
    expect(result).toEqual(leaveRequest);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO leave_requests'),
      [leaveRequest.id, leaveRequest.employeeId, leaveRequest.leaveType, leaveRequest.startDate, leaveRequest.endDate, leaveRequest.status]
    );
  });

  it('should handle errors during creation', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('Database error'));
    await expect(leaveRepository.create(leaveRequest)).rejects.toThrow('Database error');
  });
});