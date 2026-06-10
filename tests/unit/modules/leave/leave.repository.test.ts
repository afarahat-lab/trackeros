import { describe, it, expect, vi } from 'vitest';
import { LeaveRepository } from '../../../src/modules/leave/leave.repository';

// Mocking the database connection
vi.mock('../../shared/db/connection', () => ({
  query: vi.fn(),
}));

const mockDb = require('../../shared/db/connection');
const leaveRepository = new LeaveRepository();

describe('SC-2: LeaveRepository CRUD Operations', () => {
  const mockLeaveRequest = {
    id: '1',
    employeeId: 'emp123',
    leaveType: 'sick',
    startDate: new Date(),
    endDate: new Date(),
    status: 'pending',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a leave request', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [mockLeaveRequest] });
    const result = await leaveRepository.create({
      employeeId: 'emp123',
      leaveType: 'sick',
      startDate: new Date(),
      endDate: new Date(),
      status: 'pending',
    });
    expect(result).toEqual(mockLeaveRequest);
    expect(mockDb.query).toHaveBeenCalledWith(
      'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['emp123', 'sick', expect.any(Date), expect.any(Date), 'pending']
    );
  });

  it('should retrieve a leave request by ID', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [mockLeaveRequest] });
    const result = await leaveRepository.getById('1');
    expect(result).toEqual(mockLeaveRequest);
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM leave_requests WHERE id = $1',
      ['1']
    );
  });

  it('should return null if leave request not found', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });
    const result = await leaveRepository.getById('non-existent-id');
    expect(result).toBeNull();
  });

  it('should update an existing leave request', async () => {
    const updatedLeaveRequest = { ...mockLeaveRequest, status: 'approved' };
    mockDb.query.mockResolvedValueOnce({ rows: [updatedLeaveRequest] });
    const result = await leaveRepository.update('1', { status: 'approved' });
    expect(result).toEqual(updatedLeaveRequest);
    expect(mockDb.query).toHaveBeenCalledWith(
      'UPDATE leave_requests SET leave_type = $1, start_date = $2, end_date = $3, status = $4 WHERE id = $5 RETURNING *',
      [undefined, undefined, undefined, 'approved', '1']
    );
  });

  it('should return null if leave request to update not found', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] });
    const result = await leaveRepository.update('non-existent-id', { status: 'approved' });
    expect(result).toBeNull();
  });

  it('should delete a leave request by ID', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
    const result = await leaveRepository.delete('1');
    expect(result).toEqual({ message: 'Leave request deleted successfully.' });
    expect(mockDb.query).toHaveBeenCalledWith(
      'DELETE FROM leave_requests WHERE id = $1',
      ['1']
    );
  });
});