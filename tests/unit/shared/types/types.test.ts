import {
  LeaveType,
  LeaveStatus,
  EmploymentStatus,
  AuditAction,
  NotificationStatus,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
  ValidationResult,
} from '../../../../src/shared/types';

describe('LeaveType enum', () => {
  it('should have exactly six values', () => {
    const values = Object.values(LeaveType);
    expect(values).toHaveLength(6);
  });

  it('should contain all canonical leave type values', () => {
    expect(LeaveType.ANNUAL).toBe('annual');
    expect(LeaveType.SICK).toBe('sick');
    expect(LeaveType.EMERGENCY).toBe('emergency');
    expect(LeaveType.UNPAID).toBe('unpaid');
    expect(LeaveType.MATERNITY).toBe('maternity');
    expect(LeaveType.PATERNITY).toBe('paternity');
  });
});

describe('LeaveStatus enum', () => {
  it('should have exactly five values', () => {
    const values = Object.values(LeaveStatus);
    expect(values).toHaveLength(5);
  });

  it('should contain all canonical lifecycle states', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });
});

describe('EmploymentStatus enum', () => {
  it('should have exactly three values', () => {
    const values = Object.values(EmploymentStatus);
    expect(values).toHaveLength(3);
  });

  it('should contain all canonical employment statuses', () => {
    expect(EmploymentStatus.ACTIVE).toBe('ACTIVE');
    expect(EmploymentStatus.INACTIVE).toBe('INACTIVE');
    expect(EmploymentStatus.TERMINATED).toBe('TERMINATED');
  });
});

describe('AuditAction enum', () => {
  it('should have exactly seven values', () => {
    const values = Object.values(AuditAction);
    expect(values).toHaveLength(7);
  });

  it('should contain all canonical audit actions', () => {
    expect(AuditAction.CREATED).toBe('CREATED');
    expect(AuditAction.UPDATED).toBe('UPDATED');
    expect(AuditAction.APPROVED).toBe('APPROVED');
    expect(AuditAction.REJECTED).toBe('REJECTED');
    expect(AuditAction.CANCELLED).toBe('CANCELLED');
    expect(AuditAction.BALANCE_DEDUCTED).toBe('BALANCE_DEDUCTED');
    expect(AuditAction.BALANCE_RESTORED).toBe('BALANCE_RESTORED');
  });
});

describe('NotificationStatus enum', () => {
  it('should have exactly three values', () => {
    const values = Object.values(NotificationStatus);
    expect(values).toHaveLength(3);
  });

  it('should contain all canonical notification statuses', () => {
    expect(NotificationStatus.PENDING).toBe('PENDING');
    expect(NotificationStatus.SENT).toBe('SENT');
    expect(NotificationStatus.FAILED).toBe('FAILED');
  });
});

describe('CreateLeaveRequestDto', () => {
  it('should accept a valid shape with all required fields and undefined reason', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-001',
      leaveType: LeaveType.ANNUAL,
      startDate: '2026-01-10',
      endDate: '2026-01-15',
      reason: undefined,
    };
    expect(dto.employeeId).toBe('emp-001');
    expect(dto.leaveType).toBe(LeaveType.ANNUAL);
    expect(dto.startDate).toBe('2026-01-10');
    expect(dto.endDate).toBe('2026-01-15');
    expect(dto.reason).toBeUndefined();
  });

  it('should accept a valid shape with a reason string', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-002',
      leaveType: LeaveType.SICK,
      startDate: '2026-02-01',
      endDate: '2026-02-03',
      reason: 'Medical appointment',
    };
    expect(dto.reason).toBe('Medical appointment');
  });
});

describe('UpdateLeaveRequestDto', () => {
  it('should accept a valid shape with approverId set', () => {
    const dto: UpdateLeaveRequestDto = {
      status: LeaveStatus.APPROVED,
      approverId: 'mgr-001',
    };
    expect(dto.status).toBe(LeaveStatus.APPROVED);
    expect(dto.approverId).toBe('mgr-001');
  });

  it('should accept a valid shape with null approverId', () => {
    const dto: UpdateLeaveRequestDto = {
      status: LeaveStatus.CANCELLED,
      approverId: null,
    };
    expect(dto.status).toBe(LeaveStatus.CANCELLED);
    expect(dto.approverId).toBeNull();
  });
});

describe('LeaveRequestQueryParams', () => {
  it('should accept a shape with all fields undefined', () => {
    const params: LeaveRequestQueryParams = {
      employeeId: undefined,
      leaveType: undefined,
      status: undefined,
      startDate: undefined,
      endDate: undefined,
    };
    expect(params.employeeId).toBeUndefined();
    expect(params.leaveType).toBeUndefined();
    expect(params.status).toBeUndefined();
    expect(params.startDate).toBeUndefined();
    expect(params.endDate).toBeUndefined();
  });

  it('should accept a shape with all fields populated', () => {
    const params: LeaveRequestQueryParams = {
      employeeId: 'emp-001',
      leaveType: LeaveType.ANNUAL,
      status: LeaveStatus.APPROVED,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    };
    expect(params.employeeId).toBe('emp-001');
    expect(params.leaveType).toBe(LeaveType.ANNUAL);
    expect(params.status).toBe(LeaveStatus.APPROVED);
    expect(params.startDate).toBe('2026-01-01');
    expect(params.endDate).toBe('2026-01-31');
  });
});

describe('ValidationResult', () => {
  it('should accept a valid result with no errors', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
    };
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept an invalid result with errors', () => {
    const result: ValidationResult = {
      valid: false,
      errors: ['startDate must be before endDate', 'employeeId is required'],
    };
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('startDate must be before endDate');
  });
});
