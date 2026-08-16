import {
  LeaveStatus,
  LeaveType,
  AuditAction,
  NotificationStatus,
  EmploymentStatus,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
  ValidationResult,
} from '../../../../src/shared/types';

describe('LeaveStatus enum', () => {
  it('should have all expected values', () => {
    expect(LeaveStatus.DRAFT).toBe('DRAFT');
    expect(LeaveStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveStatus.APPROVED).toBe('APPROVED');
    expect(LeaveStatus.REJECTED).toBe('REJECTED');
    expect(LeaveStatus.CANCELLED).toBe('CANCELLED');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(LeaveStatus).length).toBe(5);
  });
});

describe('LeaveType enum', () => {
  it('should have all expected values', () => {
    expect(LeaveType.ANNUAL).toBe('annual');
    expect(LeaveType.SICK).toBe('sick');
    expect(LeaveType.EMERGENCY).toBe('emergency');
    expect(LeaveType.UNPAID).toBe('unpaid');
    expect(LeaveType.MATERNITY).toBe('maternity');
    expect(LeaveType.PATERNITY).toBe('paternity');
  });

  it('should have exactly 6 members', () => {
    expect(Object.keys(LeaveType).length).toBe(6);
  });
});

describe('AuditAction enum', () => {
  it('should have all expected values', () => {
    expect(AuditAction.CREATE).toBe('CREATE');
    expect(AuditAction.UPDATE).toBe('UPDATE');
    expect(AuditAction.DELETE).toBe('DELETE');
    expect(AuditAction.APPROVE).toBe('APPROVE');
    expect(AuditAction.REJECT).toBe('REJECT');
  });

  it('should have exactly 5 members', () => {
    expect(Object.keys(AuditAction).length).toBe(5);
  });
});

describe('NotificationStatus enum', () => {
  it('should have all expected values', () => {
    expect(NotificationStatus.PENDING).toBe('PENDING');
    expect(NotificationStatus.SENT).toBe('SENT');
    expect(NotificationStatus.READ).toBe('READ');
    expect(NotificationStatus.ARCHIVED).toBe('ARCHIVED');
  });

  it('should have exactly 4 members', () => {
    expect(Object.keys(NotificationStatus).length).toBe(4);
  });
});

describe('EmploymentStatus enum', () => {
  it('should have all expected values', () => {
    expect(EmploymentStatus.ACTIVE).toBe('ACTIVE');
    expect(EmploymentStatus.INACTIVE).toBe('INACTIVE');
    expect(EmploymentStatus.TERMINATED).toBe('TERMINATED');
  });

  it('should have exactly 3 members', () => {
    expect(Object.keys(EmploymentStatus).length).toBe(3);
  });
});

describe('CreateLeaveRequestDto', () => {
  it('should accept a valid DTO shape', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-001',
      leavePolicyId: 'pol-001',
      startDate: new Date('2026-08-20'),
      endDate: new Date('2026-08-22'),
      reason: 'Personal leave',
    };

    expect(dto.employeeId).toBe('emp-001');
    expect(dto.leavePolicyId).toBe('pol-001');
    expect(dto.startDate).toBeInstanceOf(Date);
    expect(dto.endDate).toBeInstanceOf(Date);
    expect(dto.reason).toBe('Personal leave');
  });

  it('should allow reason to be undefined', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-001',
      leavePolicyId: 'pol-001',
      startDate: new Date('2026-08-20'),
      endDate: new Date('2026-08-22'),
      reason: undefined,
    };

    expect(dto.reason).toBeUndefined();
  });
});

describe('UpdateLeaveRequestDto', () => {
  it('should accept a valid DTO shape with all fields set', () => {
    const dto: UpdateLeaveRequestDto = {
      startDate: new Date('2026-08-20'),
      endDate: new Date('2026-08-22'),
      reason: 'Updated reason',
      status: LeaveStatus.SUBMITTED,
    };

    expect(dto.startDate).toBeInstanceOf(Date);
    expect(dto.endDate).toBeInstanceOf(Date);
    expect(dto.reason).toBe('Updated reason');
    expect(dto.status).toBe(LeaveStatus.SUBMITTED);
  });

  it('should allow all fields to be undefined', () => {
    const dto: UpdateLeaveRequestDto = {
      startDate: undefined,
      endDate: undefined,
      reason: undefined,
      status: undefined,
    };

    expect(dto.startDate).toBeUndefined();
    expect(dto.endDate).toBeUndefined();
    expect(dto.reason).toBeUndefined();
    expect(dto.status).toBeUndefined();
  });
});

describe('LeaveRequestQueryParams', () => {
  it('should accept a valid query params shape with all fields set', () => {
    const params: LeaveRequestQueryParams = {
      employeeId: 'emp-001',
      status: LeaveStatus.APPROVED,
      leavePolicyId: 'pol-001',
      startDateFrom: new Date('2026-01-01'),
      startDateTo: new Date('2026-12-31'),
    };

    expect(params.employeeId).toBe('emp-001');
    expect(params.status).toBe(LeaveStatus.APPROVED);
    expect(params.leavePolicyId).toBe('pol-001');
    expect(params.startDateFrom).toBeInstanceOf(Date);
    expect(params.startDateTo).toBeInstanceOf(Date);
  });

  it('should allow all fields to be undefined', () => {
    const params: LeaveRequestQueryParams = {
      employeeId: undefined,
      status: undefined,
      leavePolicyId: undefined,
      startDateFrom: undefined,
      startDateTo: undefined,
    };

    expect(params.employeeId).toBeUndefined();
    expect(params.status).toBeUndefined();
    expect(params.leavePolicyId).toBeUndefined();
    expect(params.startDateFrom).toBeUndefined();
    expect(params.startDateTo).toBeUndefined();
  });
});

describe('ValidationResult', () => {
  it('should accept a valid result with no errors', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
    };

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept an invalid result with errors', () => {
    const result: ValidationResult = {
      valid: false,
      errors: ['startDate is required', 'endDate must be after startDate'],
    };

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('startDate is required');
    expect(result.errors).toContain('endDate must be after startDate');
  });
});
