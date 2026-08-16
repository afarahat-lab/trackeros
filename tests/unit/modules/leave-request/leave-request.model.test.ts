import { LeaveStatus } from '../../../../src/shared/types';
import { LeaveRequest } from '../../../../src/modules/leave-request';

describe('LeaveRequest interface', () => {
  const validLeaveRequest: LeaveRequest = {
    id: 'lr-001',
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    startDate: new Date('2026-08-10'),
    endDate: new Date('2026-08-14'),
    reason: 'Family vacation',
    status: LeaveStatus.DRAFT,
    approvedBy: null,
    approvedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-08-09T00:00:00Z'),
    updatedAt: new Date('2026-08-09T00:00:00Z'),
  };

  it('should accept a valid LeaveRequest shape with all fields', () => {
    expect(validLeaveRequest.id).toBe('lr-001');
    expect(validLeaveRequest.employeeId).toBe('emp-001');
    expect(validLeaveRequest.leavePolicyId).toBe('lp-001');
    expect(validLeaveRequest.startDate).toBeInstanceOf(Date);
    expect(validLeaveRequest.endDate).toBeInstanceOf(Date);
    expect(validLeaveRequest.reason).toBe('Family vacation');
    expect(validLeaveRequest.status).toBe(LeaveStatus.DRAFT);
    expect(validLeaveRequest.approvedBy).toBeNull();
    expect(validLeaveRequest.approvedAt).toBeNull();
    expect(validLeaveRequest.cancelledAt).toBeNull();
    expect(validLeaveRequest.createdAt).toBeInstanceOf(Date);
    expect(validLeaveRequest.updatedAt).toBeInstanceOf(Date);
  });

  it('should allow reason to be undefined', () => {
    const withoutReason: LeaveRequest = {
      ...validLeaveRequest,
      id: 'lr-002',
      reason: undefined,
    };
    expect(withoutReason.reason).toBeUndefined();
  });

  it('should have approvedBy and approvedAt both non-null when status is APPROVED', () => {
    const approved: LeaveRequest = {
      ...validLeaveRequest,
      id: 'lr-003',
      status: LeaveStatus.APPROVED,
      approvedBy: 'emp-mgr-001',
      approvedAt: new Date('2026-08-10T10:00:00Z'),
    };
    expect(approved.status).toBe(LeaveStatus.APPROVED);
    expect(approved.approvedBy).toBe('emp-mgr-001');
    expect(approved.approvedAt).toBeInstanceOf(Date);
  });

  it('should have approvedBy and approvedAt both null when status is not APPROVED', () => {
    const nonApprovedStatuses: LeaveStatus[] = [
      LeaveStatus.DRAFT,
      LeaveStatus.SUBMITTED,
      LeaveStatus.REJECTED,
      LeaveStatus.CANCELLED,
    ];

    nonApprovedStatuses.forEach((status) => {
      const request: LeaveRequest = {
        ...validLeaveRequest,
        id: `lr-status-${status}`,
        status,
        approvedBy: null,
        approvedAt: null,
        cancelledAt: status === LeaveStatus.CANCELLED ? new Date('2026-08-11T00:00:00Z') : null,
      };
      expect(request.status).toBe(status);
      expect(request.approvedBy).toBeNull();
      expect(request.approvedAt).toBeNull();
    });
  });

  it('should have cancelledAt non-null when status is CANCELLED', () => {
    const cancelled: LeaveRequest = {
      ...validLeaveRequest,
      id: 'lr-004',
      status: LeaveStatus.CANCELLED,
      cancelledAt: new Date('2026-08-11T00:00:00Z'),
    };
    expect(cancelled.status).toBe(LeaveStatus.CANCELLED);
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);
  });

  it('should have cancelledAt null when status is not CANCELLED', () => {
    const nonCancelledStatuses: LeaveStatus[] = [
      LeaveStatus.DRAFT,
      LeaveStatus.SUBMITTED,
      LeaveStatus.APPROVED,
      LeaveStatus.REJECTED,
    ];

    nonCancelledStatuses.forEach((status) => {
      const request: LeaveRequest = {
        ...validLeaveRequest,
        id: `lr-nocancel-${status}`,
        status,
        cancelledAt: null,
        approvedBy: status === LeaveStatus.APPROVED ? 'emp-mgr-001' : null,
        approvedAt: status === LeaveStatus.APPROVED ? new Date('2026-08-10T10:00:00Z') : null,
      };
      expect(request.status).toBe(status);
      expect(request.cancelledAt).toBeNull();
    });
  });

  it('should support all LeaveStatus enum values', () => {
    const statuses: LeaveStatus[] = [
      LeaveStatus.DRAFT,
      LeaveStatus.SUBMITTED,
      LeaveStatus.APPROVED,
      LeaveStatus.REJECTED,
      LeaveStatus.CANCELLED,
    ];

    statuses.forEach((status) => {
      const request: LeaveRequest = {
        ...validLeaveRequest,
        id: `lr-enum-${status}`,
        status,
        approvedBy: status === LeaveStatus.APPROVED ? 'emp-mgr-001' : null,
        approvedAt: status === LeaveStatus.APPROVED ? new Date('2026-08-10T10:00:00Z') : null,
        cancelledAt: status === LeaveStatus.CANCELLED ? new Date('2026-08-11T00:00:00Z') : null,
      };
      expect(request.status).toBe(status);
    });
  });

  it('should allow startDate to equal endDate (single-day leave)', () => {
    const singleDay: LeaveRequest = {
      ...validLeaveRequest,
      id: 'lr-single-day',
      startDate: new Date('2026-08-15'),
      endDate: new Date('2026-08-15'),
    };
    expect(singleDay.startDate.getTime()).toBe(singleDay.endDate.getTime());
  });

  it('should have exactly the expected field names', () => {
    const expectedFields = [
      'id',
      'employeeId',
      'leavePolicyId',
      'startDate',
      'endDate',
      'reason',
      'status',
      'approvedBy',
      'approvedAt',
      'cancelledAt',
      'createdAt',
      'updatedAt',
    ];

    const actualFields = Object.keys(validLeaveRequest).sort();
    expect(actualFields.sort()).toEqual(expectedFields.sort());
    expect(actualFields).toHaveLength(12);
  });
});
