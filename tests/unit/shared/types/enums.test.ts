import { LeaveType, LeaveStatus, AuditAction } from '../../../../src/shared/types/enums';

describe('LeaveType enum', () => {
  it('should have exactly the six required members', () => {
    const values = Object.values(LeaveType);
    expect(values).toHaveLength(6);
    expect(values).toContain('annual');
    expect(values).toContain('sick');
    expect(values).toContain('emergency');
    expect(values).toContain('unpaid');
    expect(values).toContain('maternity');
    expect(values).toContain('paternity');
  });

  it('should have lowercase string values matching leave_types.code column', () => {
    for (const value of Object.values(LeaveType)) {
      expect(value).toBe(value.toLowerCase());
    }
  });
});

describe('LeaveStatus enum', () => {
  it('should have exactly the five required members', () => {
    const values = Object.values(LeaveStatus);
    expect(values).toHaveLength(5);
    expect(values).toContain('DRAFT');
    expect(values).toContain('SUBMITTED');
    expect(values).toContain('APPROVED');
    expect(values).toContain('REJECTED');
    expect(values).toContain('CANCELLED');
  });

  it('should have uppercase string values matching leave_requests.status column', () => {
    for (const value of Object.values(LeaveStatus)) {
      expect(value).toBe(value.toUpperCase());
    }
  });
});

describe('AuditAction enum', () => {
  it('should have exactly the seven required members', () => {
    const values = Object.values(AuditAction);
    expect(values).toHaveLength(7);
    expect(values).toContain('CREATED');
    expect(values).toContain('SUBMITTED');
    expect(values).toContain('APPROVED');
    expect(values).toContain('REJECTED');
    expect(values).toContain('CANCELLED');
    expect(values).toContain('BALANCE_DEDUCTED');
    expect(values).toContain('BALANCE_RESTORED');
  });

  it('should have uppercase string values matching audit_logs.action column', () => {
    for (const value of Object.values(AuditAction)) {
      expect(value).toBe(value.toUpperCase());
    }
  });
});
