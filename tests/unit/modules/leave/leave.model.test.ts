
import type {
  LeaveType,
  LeaveRequestStatus,
  LeavePolicy,
  LeaveRequest,
  LeaveBalance,
  CreateLeaveRequestDto,
  UpdateLeaveRequestStatusDto,
} from '../../../../src/modules/leave/leave.model';

describe('LeaveType', () => {
  it('should define the correct literal union values', () => {
    const validLeaveTypes: LeaveType[] = [
      'annual',
      'sick',
      'emergency',
      'unpaid',
      'maternity',
      'paternity',
    ];
    expect(validLeaveTypes).toHaveLength(6);
    expect(validLeaveTypes).toContain('annual');
    expect(validLeaveTypes).toContain('sick');
    expect(validLeaveTypes).toContain('emergency');
    expect(validLeaveTypes).toContain('unpaid');
    expect(validLeaveTypes).toContain('maternity');
    expect(validLeaveTypes).toContain('paternity');
  });
});

describe('LeaveRequestStatus', () => {
  it('should define the correct literal union values', () => {
    const validStatuses: LeaveRequestStatus[] = [
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ];
    expect(validStatuses).toHaveLength(5);
    expect(validStatuses).toContain('DRAFT');
    expect(validStatuses).toContain('SUBMITTED');
    expect(validStatuses).toContain('APPROVED');
    expect(validStatuses).toContain('REJECTED');
    expect(validStatuses).toContain('CANCELLED');
  });
});

describe('LeavePolicy', () => {
  it('should allow creating a valid LeavePolicy object', () => {
    const now = new Date();
    const policy: LeavePolicy = {
      id: 'policy-1',
      policyName: 'Annual Leave',
      leaveType: 'annual',
      entitlementDays: 20,
      accrualRate: 1.67,
      maxAccumulation: 30,
      minimumNoticeDays: 7,
      requiresManagerApproval: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    expect(policy.id).toBe('policy-1');
    expect(policy.policyName).toBe('Annual Leave');
    expect(policy.leaveType).toBe('annual');
    expect(policy.entitlementDays).toBe(20);
    expect(policy.accrualRate).toBe(1.67);
    expect(policy.maxAccumulation).toBe(30);
    expect(policy.minimumNoticeDays).toBe(7);
    expect(policy.requiresManagerApproval).toBe(true);
    expect(policy.isActive).toBe(true);
    expect(policy.createdAt).toBeInstanceOf(Date);
    expect(policy.updatedAt).toBeInstanceOf(Date);
  });

  it('should allow null for optional fields', () => {
    const now = new Date();
    const policy: LeavePolicy = {
      id: 'policy-2',
      policyName: 'Sick Leave',
      leaveType: 'sick',
      entitlementDays: 10,
      accrualRate: null,
      maxAccumulation: null,
      minimumNoticeDays: null,
      requiresManagerApproval: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    expect(policy.accrualRate).toBeNull();
    expect(policy.maxAccumulation).toBeNull();
    expect(policy.minimumNoticeDays).toBeNull();
  });
});

describe('LeaveRequest', () => {
  it('should allow creating a valid LeaveRequest object', () => {
    const now = new Date();
    const request: LeaveRequest = {
      id: 'req-1',
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-05'),
      reason: 'Family vacation',
      status: 'SUBMITTED',
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      cancelledBy: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };

    expect(request.id).toBe('req-1');
    expect(request.employeeId).toBe('emp-1');
    expect(request.leaveTypeId).toBe('lt-1');
    expect(request.startDate).toBeInstanceOf(Date);
    expect(request.endDate).toBeInstanceOf(Date);
    expect(request.reason).toBe('Family vacation');
    expect(request.status).toBe('SUBMITTED');
    expect(request.approvedBy).toBeNull();
    expect(request.approvedAt).toBeNull();
    expect(request.rejectedBy).toBeNull();
    expect(request.rejectedAt).toBeNull();
    expect(request.rejectionReason).toBeNull();
    expect(request.cancelledBy).toBeNull();
    expect(request.cancelledAt).toBeNull();
  });

  it('should allow undefined reason', () => {
    const now = new Date();
    const request: LeaveRequest = {
      id: 'req-2',
      employeeId: 'emp-2',
      leaveTypeId: 'lt-2',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-03'),
      reason: undefined,
      status: 'DRAFT',
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      cancelledBy: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };

    expect(request.reason).toBeUndefined();
  });
});

describe('LeaveBalance', () => {
  it('should allow creating a valid LeaveBalance object', () => {
    const now = new Date();
    const balance: LeaveBalance = {
      id: 'bal-1',
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      entitlementDays: 20,
      usedDays: 5,
      accruedDays: 10,
      year: 2026,
      createdAt: now,
      updatedAt: now,
    };

    expect(balance.id).toBe('bal-1');
    expect(balance.employeeId).toBe('emp-1');
    expect(balance.leaveTypeId).toBe('lt-1');
    expect(balance.entitlementDays).toBe(20);
    expect(balance.usedDays).toBe(5);
    expect(balance.accruedDays).toBe(10);
    expect(balance.year).toBe(2026);
    expect(balance.createdAt).toBeInstanceOf(Date);
    expect(balance.updatedAt).toBeInstanceOf(Date);
  });
});

describe('CreateLeaveRequestDto', () => {
  it('should allow creating a valid DTO', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-05'),
      reason: 'Personal reasons',
    };

    expect(dto.employeeId).toBe('emp-1');
    expect(dto.leaveTypeId).toBe('lt-1');
    expect(dto.startDate).toBeInstanceOf(Date);
    expect(dto.endDate).toBeInstanceOf(Date);
    expect(dto.reason).toBe('Personal reasons');
  });

  it('should allow undefined reason', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-1',
      leaveTypeId: 'lt-1',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-05'),
      reason: undefined,
    };

    expect(dto.reason).toBeUndefined();
  });
});

describe('UpdateLeaveRequestStatusDto', () => {
  it('should allow creating a valid DTO for approval', () => {
    const dto: UpdateLeaveRequestStatusDto = {
      status: 'APPROVED',
      reviewerId: 'mgr-1',
      rejectionReason: undefined,
    };

    expect(dto.status).toBe('APPROVED');
    expect(dto.reviewerId).toBe('mgr-1');
    expect(dto.rejectionReason).toBeUndefined();
  });

  it('should allow creating a valid DTO for rejection with reason', () => {
    const dto: UpdateLeaveRequestStatusDto = {
      status: 'REJECTED',
      reviewerId: 'mgr-1',
      rejectionReason: 'Insufficient staffing',
    };

    expect(dto.status).toBe('REJECTED');
    expect(dto.reviewerId).toBe('mgr-1');
    expect(dto.rejectionReason).toBe('Insufficient staffing');
  });
});
