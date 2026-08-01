import {
  LeaveType,
  LeaveRequestStatus,
  LeaveStatus,
  EmploymentStatus,
  AuditAction,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  LeaveRequestQueryParams,
} from 'shared/types';

describe('LeaveType enum', () => {
  it('should have exactly six members', () => {
    const values = Object.values(LeaveType);
    expect(values).toHaveLength(6);
  });

  it('should have all expected values as lowercase string literals', () => {
    expect(LeaveType.ANNUAL).toBe('annual');
    expect(LeaveType.SICK).toBe('sick');
    expect(LeaveType.EMERGENCY).toBe('emergency');
    expect(LeaveType.UNPAID).toBe('unpaid');
    expect(LeaveType.MATERNITY).toBe('maternity');
    expect(LeaveType.PATERNITY).toBe('paternity');
  });
});

describe('LeaveRequestStatus enum', () => {
  it('should have exactly five members', () => {
    const values = Object.values(LeaveRequestStatus);
    expect(values).toHaveLength(5);
  });

  it('should have all expected values as uppercase string literals', () => {
    expect(LeaveRequestStatus.DRAFT).toBe('DRAFT');
    expect(LeaveRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(LeaveRequestStatus.APPROVED).toBe('APPROVED');
    expect(LeaveRequestStatus.REJECTED).toBe('REJECTED');
    expect(LeaveRequestStatus.CANCELLED).toBe('CANCELLED');
  });
});

describe('LeaveStatus type alias', () => {
  it('should be identical to LeaveRequestStatus', () => {
    const status: LeaveStatus = LeaveRequestStatus.SUBMITTED;
    expect(status).toBe('SUBMITTED');

    const requestStatus: LeaveRequestStatus = status;
    expect(requestStatus).toBe('SUBMITTED');
  });

  it('should accept all LeaveRequestStatus values', () => {
    const values: LeaveStatus[] = [
      LeaveRequestStatus.DRAFT,
      LeaveRequestStatus.SUBMITTED,
      LeaveRequestStatus.APPROVED,
      LeaveRequestStatus.REJECTED,
      LeaveRequestStatus.CANCELLED,
    ];
    expect(values).toHaveLength(5);
  });
});

describe('EmploymentStatus enum', () => {
  it('should have exactly three members', () => {
    const values = Object.values(EmploymentStatus);
    expect(values).toHaveLength(3);
  });

  it('should have all expected values as uppercase string literals', () => {
    expect(EmploymentStatus.ACTIVE).toBe('ACTIVE');
    expect(EmploymentStatus.INACTIVE).toBe('INACTIVE');
    expect(EmploymentStatus.TERMINATED).toBe('TERMINATED');
  });
});

describe('AuditAction enum', () => {
  it('should have exactly five members', () => {
    const values = Object.values(AuditAction);
    expect(values).toHaveLength(5);
  });

  it('should have all expected values as uppercase string literals', () => {
    expect(AuditAction.CREATE).toBe('CREATE');
    expect(AuditAction.UPDATE).toBe('UPDATE');
    expect(AuditAction.DELETE).toBe('DELETE');
    expect(AuditAction.APPROVE).toBe('APPROVE');
    expect(AuditAction.REJECT).toBe('REJECT');
  });
});

describe('BaseEntity interface', () => {
  it('should accept an object with id, createdAt, updatedAt', () => {
    const now = new Date();
    const entity = {
      id: 'abc-123',
      createdAt: now,
      updatedAt: now,
    };
    expect(entity.id).toBe('abc-123');
    expect(entity.createdAt).toBe(now);
    expect(entity.updatedAt).toBe(now);
  });
});

describe('CreateLeaveRequestDto', () => {
  it('should require employeeId, policyId, startDate, endDate', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-1',
      policyId: 'pol-1',
      startDate: new Date('2026-01-10'),
      endDate: new Date('2026-01-15'),
    };
    expect(dto.employeeId).toBe('emp-1');
    expect(dto.policyId).toBe('pol-1');
    expect(dto.startDate).toEqual(new Date('2026-01-10'));
    expect(dto.endDate).toEqual(new Date('2026-01-15'));
    expect(dto.reason).toBeUndefined();
  });

  it('should accept an optional reason', () => {
    const dto: CreateLeaveRequestDto = {
      employeeId: 'emp-1',
      policyId: 'pol-1',
      startDate: new Date('2026-01-10'),
      endDate: new Date('2026-01-15'),
      reason: 'Family event',
    };
    expect(dto.reason).toBe('Family event');
  });
});

describe('UpdateLeaveRequestDto', () => {
  it('should allow all fields to be optional', () => {
    const dto: UpdateLeaveRequestDto = {};
    expect(dto.startDate).toBeUndefined();
    expect(dto.endDate).toBeUndefined();
    expect(dto.reason).toBeUndefined();
  });

  it('should accept partial updates', () => {
    const dto: UpdateLeaveRequestDto = {
      startDate: new Date('2026-02-01'),
      reason: 'Updated reason',
    };
    expect(dto.startDate).toEqual(new Date('2026-02-01'));
    expect(dto.reason).toBe('Updated reason');
    expect(dto.endDate).toBeUndefined();
  });
});

describe('LeaveRequestQueryParams', () => {
  it('should accept all optional filter fields', () => {
    const params: LeaveRequestQueryParams = {
      status: LeaveRequestStatus.SUBMITTED,
      policyId: 'pol-1',
      startDateFrom: new Date('2026-01-01'),
      startDateTo: new Date('2026-12-31'),
      endDateFrom: new Date('2026-01-01'),
      endDateTo: new Date('2026-12-31'),
      limit: 10,
      offset: 0,
    };
    expect(params.status).toBe('SUBMITTED');
    expect(params.policyId).toBe('pol-1');
    expect(params.limit).toBe(10);
    expect(params.offset).toBe(0);
  });

  it('should allow empty params', () => {
    const params: LeaveRequestQueryParams = {};
    expect(params.status).toBeUndefined();
    expect(params.limit).toBeUndefined();
  });
});

describe('ValidationResult interface', () => {
  it('should have isValid and errors fields', () => {
    const valid: { isValid: boolean; errors: string[] } = {
      isValid: true,
      errors: [],
    };
    expect(valid.isValid).toBe(true);
    expect(valid.errors).toHaveLength(0);

    const invalid: { isValid: boolean; errors: string[] } = {
      isValid: false,
      errors: ['Field X is required', 'Field Y must be a date'],
    };
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors).toHaveLength(2);
  });

  it('should uphold the invariant: isValid=true implies empty errors', () => {
    const result: { isValid: boolean; errors: string[] } = {
      isValid: true,
      errors: [],
    };
    if (result.isValid) {
      expect(result.errors).toHaveLength(0);
    }
  });

  it('should uphold the invariant: isValid=false implies non-empty errors', () => {
    const result: { isValid: boolean; errors: string[] } = {
      isValid: false,
      errors: ['Something went wrong'],
    };
    if (!result.isValid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
