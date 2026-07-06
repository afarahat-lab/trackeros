
import { LeaveStatus } from '../../../../src/shared/types/leave.types';
import {
  LeaveRequest,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
} from '../../../../src/modules/leave/leave.model';

describe('LeaveRequest', () => {
  const validRequest: LeaveRequest = {
    id: 1,
    employeeId: 100,
    leaveTypeId: 10,
    startDate: new Date('2026-07-10'),
    endDate: new Date('2026-07-15'),
    reason: 'Family vacation',
    status: LeaveStatus.PENDING,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date('2026-07-01'),
    updatedAt: new Date('2026-07-01'),
  };

  it('should have all required fields', () => {
    expect(validRequest.id).toBe(1);
    expect(validRequest.employeeId).toBe(100);
    expect(validRequest.leaveTypeId).toBe(10);
    expect(validRequest.startDate).toBeInstanceOf(Date);
    expect(validRequest.endDate).toBeInstanceOf(Date);
    expect(validRequest.reason).toBe('Family vacation');
    expect(validRequest.status).toBe(LeaveStatus.PENDING);
    expect(validRequest.createdAt).toBeInstanceOf(Date);
    expect(validRequest.updatedAt).toBeInstanceOf(Date);
  });

  it('should support approved status with approver details', () => {
    const approved: LeaveRequest = {
      ...validRequest,
      id: 2,
      status: LeaveStatus.APPROVED,
      approvedBy: 200,
      approvedAt: new Date('2026-07-02'),
    };
    expect(approved.status).toBe(LeaveStatus.APPROVED);
    expect(approved.approvedBy).toBe(200);
    expect(approved.approvedAt).toBeInstanceOf(Date);
  });

  it('should support rejected status with rejection details', () => {
    const rejected: LeaveRequest = {
      ...validRequest,
      id: 3,
      status: LeaveStatus.REJECTED,
      rejectedBy: 200,
      rejectedAt: new Date('2026-07-02'),
      rejectionReason: 'Insufficient coverage',
    };
    expect(rejected.status).toBe(LeaveStatus.REJECTED);
    expect(rejected.rejectedBy).toBe(200);
    expect(rejected.rejectionReason).toBe('Insufficient coverage');
  });

  it('should support cancelled status with cancellation details', () => {
    const cancelled: LeaveRequest = {
      ...validRequest,
      id: 4,
      status: LeaveStatus.CANCELLED,
      cancelledBy: 100,
      cancelledAt: new Date('2026-07-03'),
      cancellationReason: 'No longer needed',
    };
    expect(cancelled.status).toBe(LeaveStatus.CANCELLED);
    expect(cancelled.cancelledBy).toBe(100);
    expect(cancelled.cancellationReason).toBe('No longer needed');
  });
});

describe('CreateLeaveRequestDto', () => {
  it('should require all mandatory fields', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 100,
      leaveTypeId: 10,
      startDate: new Date('2026-07-10'),
      endDate: new Date('2026-07-15'),
      reason: 'Family vacation',
    };
    expect(dto.employeeId).toBe(100);
    expect(dto.leaveTypeId).toBe(10);
    expect(dto.startDate).toBeInstanceOf(Date);
    expect(dto.endDate).toBeInstanceOf(Date);
    expect(dto.reason).toBe('Family vacation');
  });
});

describe('UpdateLeaveRequestDto', () => {
  it('should allow empty update', () => {
    const dto: UpdateLeaveRequestDto = {};
    expect(dto.startDate).toBeUndefined();
    expect(dto.endDate).toBeUndefined();
    expect(dto.reason).toBeUndefined();
  });

  it('should allow partial updates', () => {
    const dto: UpdateLeaveRequestDto = {
      reason: 'Updated reason',
    };
    expect(dto.reason).toBe('Updated reason');
    expect(dto.startDate).toBeUndefined();
    expect(dto.endDate).toBeUndefined();
  });

  it('should allow full update', () => {
    const dto: UpdateLeaveRequestDto = {
      startDate: new Date('2026-07-12'),
      endDate: new Date('2026-07-18'),
      reason: 'Extended vacation',
    };
    expect(dto.startDate).toBeInstanceOf(Date);
    expect(dto.endDate).toBeInstanceOf(Date);
    expect(dto.reason).toBe('Extended vacation');
  });
});

describe('LeaveRequestQueryParams', () => {
  it('should allow empty params', () => {
    const params: LeaveRequestQueryParams = {};
    expect(params.employeeId).toBeUndefined();
    expect(params.leaveTypeId).toBeUndefined();
    expect(params.status).toBeUndefined();
    expect(params.startDate).toBeUndefined();
    expect(params.endDate).toBeUndefined();
  });

  it('should accept all optional filters', () => {
    const params: LeaveRequestQueryParams = {
      employeeId: 100,
      leaveTypeId: 10,
      status: LeaveStatus.PENDING,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-31'),
    };
    expect(params.employeeId).toBe(100);
    expect(params.leaveTypeId).toBe(10);
    expect(params.status).toBe(LeaveStatus.PENDING);
    expect(params.startDate).toBeInstanceOf(Date);
    expect(params.endDate).toBeInstanceOf(Date);
  });

  it('should accept partial filters', () => {
    const params: LeaveRequestQueryParams = {
      status: LeaveStatus.APPROVED,
    };
    expect(params.employeeId).toBeUndefined();
    expect(params.status).toBe(LeaveStatus.APPROVED);
  });
});
