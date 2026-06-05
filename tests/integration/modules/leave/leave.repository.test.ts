import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { PostgresLeaveRepository } from '../../../src/modules/leave/leave.repository';
import { LeaveStatus } from '../../../src/shared/types';

jest.mock('pg', () => {
  const mPool = {
    query: jest.fn()
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('SC-2: Repository implements specified methods', () => {
  let repository: PostgresLeaveRepository;
  let pool: jest.Mocked<Pool>;

  beforeEach(() => {
    pool = new Pool() as jest.Mocked<Pool>;
    repository = new PostgresLeaveRepository(pool);
  });

  it('should create a leave request', async () => {
    const dto = {
      employeeId: 'emp123',
      leaveType: 'Sick',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-10'),
      reason: 'Flu'
    };
    const mockLeaveRequest = {
      id: '1',
      ...dto,
      status: LeaveStatus.Pending,
      managerId: 'manager-id-placeholder'
    };
    pool.query.mockResolvedValue({ rows: [mockLeaveRequest] });

    const result = await repository.createRequest(dto);

    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      [dto.employeeId, dto.leaveType, dto.startDate, dto.endDate, dto.reason, LeaveStatus.Pending, 'manager-id-placeholder']
    );
    expect(result).toEqual(mockLeaveRequest);
  });

  it('should find a leave request by id', async () => {
    const mockLeaveRequest = {
      id: '1',
      employeeId: 'emp123',
      leaveType: 'Sick',
      status: LeaveStatus.Pending,
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-10'),
      reason: 'Flu',
      managerId: 'mgr456'
    };
    pool.query.mockResolvedValue({ rows: [mockLeaveRequest] });

    const result = await repository.findById('1');

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['1']);
    expect(result).toEqual(mockLeaveRequest);
  });

  it('should return null if leave request not found by id', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const result = await repository.findById('non-existent-id');

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['non-existent-id']);
    expect(result).toBeNull();
  });

  it('should find leave requests by employee id', async () => {
    const mockLeaveRequests = [
      {
        id: '1',
        employeeId: 'emp123',
        leaveType: 'Sick',
        status: LeaveStatus.Pending,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-10'),
        reason: 'Flu',
        managerId: 'mgr456'
      }
    ];
    pool.query.mockResolvedValue({ rows: mockLeaveRequests });

    const result = await repository.findByEmployeeId('emp123');

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['emp123']);
    expect(result).toEqual(mockLeaveRequests);
  });

  it('should find pending leave requests by manager id', async () => {
    const mockLeaveRequests = [
      {
        id: '1',
        employeeId: 'emp123',
        leaveType: 'Sick',
        status: LeaveStatus.Pending,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-10'),
        reason: 'Flu',
        managerId: 'mgr456'
      }
    ];
    pool.query.mockResolvedValue({ rows: mockLeaveRequests });

    const result = await repository.findPendingByManagerId('mgr456');

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['mgr456', LeaveStatus.Pending]);
    expect(result).toEqual(mockLeaveRequests);
  });

  it('should update the status of a leave request', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await repository.updateStatus('1', LeaveStatus.Approved);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['1', LeaveStatus.Approved]);
  });
});
