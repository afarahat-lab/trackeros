import { LeaveType, LeaveRequestStatus } from '../../../../src/shared/types/leave.types';
import { LeaveRequest, CreateLeaveRequestDto } from '../../../../src/modules/leave/leave.model';

describe('LeaveRequest', () => {
  it('should allow creating a valid LeaveRequest object', () => {
    const now = new Date();
    const request: LeaveRequest = {
      id: 'lr-001',
      employeeId: 'emp-001',
      leaveType: LeaveType.ANNUAL,
      leavePolicyId: 'lp-001',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-05'),
      totalDays: 5,
      reason: 'Family vacation',
      status: LeaveRequestStatus.DRAFT,
      managerId: null,
      managerComment: null,
      submittedAt: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    expect(request.id).toBe('lr-001');
    expect(request.employeeId).toBe('emp-001');
    expect(request.leaveType).toBe(LeaveType.ANNUAL);
    expect(request.leavePolicyId).toBe('lp-001');
    expect(request.startDate).toEqual(new Date('2026-08-01'));
    expect(request.endDate).toEqual(new Date('2026-08-05'));
    expect(request.totalDays).toBe(5);
    expect(request.reason).toBe('Family vacation');
    expect(request.status).toBe(LeaveRequestStatus.DRAFT);
    expect(request.managerId).toBeNull();
    expect(request.managerComment).toBeNull();
    expect(request.submittedAt).toBeNull();
    expect(request.reviewedAt).toBeNull();
    expect(request.createdAt).toBe(now);
    expect(request.updatedAt).toBe(now);
  });

  it('should allow a LeaveRequest with manager details and timestamps', () => {
    const submittedAt = new Date('2026-07-01');
    const reviewedAt = new Date('2026-07-02');
    const request: LeaveRequest = {
      id: 'lr-002',
      employeeId: 'emp-002',
      leaveType: LeaveType.SICK,
      leavePolicyId: 'lp-002',
      startDate: new Date('2026-07-10'),
      endDate: new Date('2026-07-12'),
      totalDays: 3,
      reason: 'Medical appointment',
      status: LeaveRequestStatus.APPROVED,
      managerId: 'mgr-001',
      managerComment: 'Approved, get well soon',
      submittedAt,
      reviewedAt,
      createdAt: new Date('2026-07-01'),
      updatedAt: new Date('2026-07-02'),
    };

    expect(request.managerId).toBe('mgr-001');
    expect(request.managerComment).toBe('Approved, get well soon');
    expect(request.submittedAt).toBe(submittedAt);
    expect(request.reviewedAt).toBe(reviewedAt);
    expect(request.status).toBe(LeaveRequestStatus.APPROVED);
  });
});

describe('CreateLeaveRequestDto', () => {
  it('should allow creating a valid DTO (omits id, status, timestamps)', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-001',
      leaveType: LeaveType.EMERGENCY,
      leavePolicyId: 'lp-003',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-03'),
      totalDays: 3,
      reason: 'Family emergency',
      managerId: null,
      managerComment: null,
    };

    expect(dto.employeeId).toBe('emp-001');
    expect(dto.leaveType).toBe(LeaveType.EMERGENCY);
    expect(dto.leavePolicyId).toBe('lp-003');
    expect(dto.startDate).toEqual(new Date('2026-09-01'));
    expect(dto.endDate).toEqual(new Date('2026-09-03'));
    expect(dto.totalDays).toBe(3);
    expect(dto.reason).toBe('Family emergency');
    expect(dto.managerId).toBeNull();
    expect(dto.managerComment).toBeNull();
    // Verify DTO does not have id, status, or timestamps
    expect('id' in dto).toBe(false);
    expect('status' in dto).toBe(false);
    expect('submittedAt' in dto).toBe(false);
    expect('reviewedAt' in dto).toBe(false);
    expect('createdAt' in dto).toBe(false);
    expect('updatedAt' in dto).toBe(false);
  });

  it('should allow a DTO with managerId set', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-003',
      leaveType: LeaveType.ANNUAL,
      leavePolicyId: 'lp-001',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-10'),
      totalDays: 10,
      reason: 'Annual leave',
      managerId: 'mgr-002',
      managerComment: null,
    };

    expect(dto.managerId).toBe('mgr-002');
  });
});
