import { ValidationService, calculateRequestedDays } from '../../../../src/modules/validation';
import { ValidationError, ConflictError } from '../../../../src/shared/errors';
import { LeaveTypeCode } from '../../../../src/shared/types';
import { LeaveBalance } from '../../../../src/modules/balance';

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'b-1',
    employeeId: 'e-1',
    leaveTypeCode: LeaveTypeCode.ANNUAL,
    periodStart: d(2025, 1, 1),
    periodEnd: d(2025, 12, 31),
    entitledDays: 20,
    usedDays: 0,
    pendingDays: 0,
    ...overrides,
  };
}

describe('calculateRequestedDays (inclusive day count)', () => {
  it('counts a single day as 1', () => {
    expect(calculateRequestedDays(d(2025, 6, 1), d(2025, 6, 1))).toBe(1);
  });

  it('counts two consecutive days as 2 (inclusive end)', () => {
    expect(calculateRequestedDays(d(2025, 6, 1), d(2025, 6, 2))).toBe(2);
  });

  it('counts all calendar days across a weekend (no weekend exclusion)', () => {
    // Fri 2025-06-06 -> Mon 2025-06-09 spans a weekend and is 4 inclusive days.
    expect(calculateRequestedDays(d(2025, 6, 6), d(2025, 6, 9))).toBe(4);
  });

  it('counts across a month boundary', () => {
    // 2025-02-27 -> 2025-03-02 = 4 inclusive days.
    expect(calculateRequestedDays(d(2025, 2, 27), d(2025, 3, 2))).toBe(4);
  });
});

describe('ValidationService.validateDateRange', () => {
  const service = new ValidationService();

  it('accepts startDate before endDate', () => {
    expect(() => service.validateDateRange(d(2025, 6, 1), d(2025, 6, 5))).not.toThrow();
  });

  it('accepts startDate equal to endDate', () => {
    expect(() => service.validateDateRange(d(2025, 6, 1), d(2025, 6, 1))).not.toThrow();
  });

  it('rejects startDate after endDate with ValidationError', () => {
    expect(() => service.validateDateRange(d(2025, 6, 5), d(2025, 6, 1))).toThrow(ValidationError);
  });
});

describe('ValidationService.validateSufficiency', () => {
  const service = new ValidationService();

  it('passes when unused >= requested', () => {
    expect(() =>
      service.validateSufficiency(makeBalance({ entitledDays: 20, usedDays: 5, pendingDays: 2 }), 13)
    ).not.toThrow();
  });

  it('passes when unused exactly equals requested', () => {
    expect(() =>
      service.validateSufficiency(makeBalance({ entitledDays: 20, usedDays: 5, pendingDays: 5 }), 10)
    ).not.toThrow();
  });

  it('rejects with ConflictError when unused < requested', () => {
    expect(() =>
      service.validateSufficiency(makeBalance({ entitledDays: 20, usedDays: 5, pendingDays: 5 }), 11)
    ).toThrow(ConflictError);
  });

  it('accounts for pendingDays against entitlement', () => {
    expect(() =>
      service.validateSufficiency(makeBalance({ entitledDays: 20, usedDays: 0, pendingDays: 18 }), 3)
    ).toThrow(ConflictError);
  });
});

describe('ValidationService.validateLeaveRequest', () => {
  const service = new ValidationService();

  it('accepts a valid request with sufficient balance', () => {
    const dto = {
      employeeId: 'e-1',
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      startDate: d(2025, 6, 1),
      endDate: d(2025, 6, 3),
    };
    const balance = makeBalance({ entitledDays: 20, usedDays: 0, pendingDays: 0 });
    expect(() => service.validateLeaveRequest(dto, balance)).not.toThrow();
  });

  it('throws ConflictError when the inclusive count exceeds available balance', () => {
    const dto = {
      employeeId: 'e-1',
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      startDate: d(2025, 6, 1),
      endDate: d(2025, 6, 4),
    };
    // requestedDays = 4 > unused (3)
    const balance = makeBalance({ entitledDays: 20, usedDays: 10, pendingDays: 7 });
    expect(() => service.validateLeaveRequest(dto, balance)).toThrow(ConflictError);
  });

  it('throws ValidationError for an inverted date range', () => {
    const dto = {
      employeeId: 'e-1',
      leaveTypeCode: LeaveTypeCode.ANNUAL,
      startDate: d(2025, 6, 10),
      endDate: d(2025, 6, 1),
    };
    expect(() => service.validateLeaveRequest(dto, makeBalance())).toThrow(ValidationError);
  });
});
