import {
  LeaveStatus,
  LeaveTypeCode,
  AuditAction,
  NotificationStatus,
  EmploymentStatus,
  EmployeeRole,
  requestedDays,
} from '../../../src/shared/types';

describe('shared enums', () => {
  it('LeaveStatus exposes exactly the five lifecycle states', () => {
    expect(Object.values(LeaveStatus)).toEqual([
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ]);
  });

  it('LeaveTypeCode exposes exactly six lowercase members', () => {
    expect(Object.values(LeaveTypeCode)).toEqual([
      'annual',
      'sick',
      'emergency',
      'unpaid',
      'maternity',
      'paternity',
    ]);
  });

  it('AuditAction exposes exactly CREATE, UPDATE, DELETE, APPROVE, REJECT, CANCEL', () => {
    expect(Object.values(AuditAction)).toEqual([
      'CREATE',
      'UPDATE',
      'DELETE',
      'APPROVE',
      'REJECT',
      'CANCEL',
    ]);
  });

  it('NotificationStatus exposes exactly PENDING, SENT, READ, ARCHIVED', () => {
    expect(Object.values(NotificationStatus)).toEqual([
      'PENDING',
      'SENT',
      'READ',
      'ARCHIVED',
    ]);
  });

  it('EmploymentStatus exposes exactly ACTIVE, TERMINATED, ON_LEAVE', () => {
    expect(Object.values(EmploymentStatus)).toEqual([
      'ACTIVE',
      'TERMINATED',
      'ON_LEAVE',
    ]);
  });

  it('EmployeeRole exposes exactly EMPLOYEE, MANAGER, ADMIN', () => {
    expect(Object.values(EmployeeRole)).toEqual(['EMPLOYEE', 'MANAGER', 'ADMIN']);
  });
});

describe('requestedDays (inclusive calendar-day count)', () => {
  it('counts a single day as 1', () => {
    expect(requestedDays(new Date('2026-01-01'), new Date('2026-01-01'))).toBe(1);
  });

  it('is inclusive of both endpoints', () => {
    expect(requestedDays(new Date('2026-01-01'), new Date('2026-01-03'))).toBe(3);
  });

  it('does not exclude weekends', () => {
    // Friday 2026-01-02 through Sunday 2026-01-04 -> 3 days.
    expect(requestedDays(new Date('2026-01-02'), new Date('2026-01-04'))).toBe(3);
  });

  it('handles month boundaries', () => {
    expect(requestedDays(new Date('2026-01-30'), new Date('2026-02-01'))).toBe(3);
  });

  it('handles a full week', () => {
    expect(requestedDays(new Date('2026-01-01'), new Date('2026-01-07'))).toBe(7);
  });
});
