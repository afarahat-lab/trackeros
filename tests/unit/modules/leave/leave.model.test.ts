import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  LeaveRequest,
  CreateLeaveRequestDTO,
  UpdateLeaveRequestStatusDTO,
  LeaveRequestStatus,
  LeaveType
} from '../../../../src/modules/leave/leave.model';

describe('SC-1: leave.model exports and shapes', () => {
  beforeEach(() => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports the defined LeaveRequest shape', () => {
    const status: LeaveRequestStatus = 'PENDING';
    const leaveType: LeaveType = 'ANNUAL';

    const request: LeaveRequest = {
      id: 'lr-1',
      employeeId: 'emp-1',
      leaveType,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      status,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    expect(request.id).toBe('lr-1');
    expect(request.leaveType).toBe('ANNUAL');
    expect(request.status).toBe('PENDING');
    expect(request.startDate).toBeInstanceOf(Date);
  });

  it('supports CreateLeaveRequestDTO and UpdateLeaveRequestStatusDTO shapes', () => {
    const createDto: CreateLeaveRequestDTO = {
      employeeId: 'emp-1',
      leaveType: 'SICK',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-02')
    };

    const updateDto: UpdateLeaveRequestStatusDTO = {
      id: 'lr-1',
      status: 'APPROVED'
    };

    expect(createDto.employeeId).toBe('emp-1');
    expect(createDto.leaveType).toBe('SICK');
    expect(updateDto.status).toBe('APPROVED');
  });

  it('accepts all architecture-defined status and leave type values', () => {
    const statuses: LeaveRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
    const leaveTypes: LeaveType[] = ['ANNUAL', 'SICK', 'EMERGENCY'];

    expect(statuses).toEqual(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
    expect(leaveTypes).toEqual(['ANNUAL', 'SICK', 'EMERGENCY']);
  });
});