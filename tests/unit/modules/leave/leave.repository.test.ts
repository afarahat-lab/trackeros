import { describe, it, expect, vi } from 'vitest';
import { LeaveRepository } from './leave.repository';
import { CreateLeaveRequestDto } from './leave.model';

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
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1', ...leaveRequestDto }] });
    const result = await leaveRepository.create(leaveRequestDto);
    expect(result).toHaveProperty('id', '1');
    expect(result).toHaveProperty('employeeId', leaveRequestDto.employeeId);
  });

  it('should retrieve a leave request by ID', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1', ...leaveRequestDto }] });
    const result = await leaveRepository.findById('1');
    expect(result).toHaveProperty('id', '1');
  });

  it('should update an existing leave request', async () => {
    const updatedDto: CreateLeaveRequestDto = { ...leaveRequestDto, status: 'approved' };
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1', ...updatedDto }] });
    const result = await leaveRepository.update('1', updatedDto);
    expect(result).toHaveProperty('status', 'approved');
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