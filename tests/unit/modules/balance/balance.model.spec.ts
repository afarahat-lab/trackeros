
import { LeaveBalance, LeaveBalanceQueryParams } from '../../../../src/modules/balance/balance.model';

describe('LeaveBalance', () => {
  const validBalance: LeaveBalance = {
    id: 1,
    employeeId: 100,
    policyId: 10,
    totalEntitlement: 20,
    usedDays: 5,
    pendingDays: 2,
    availableDays: 13,
    fiscalYear: 2026,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
  };

  it('should have all required fields', () => {
    expect(validBalance.id).toBe(1);
    expect(validBalance.employeeId).toBe(100);
    expect(validBalance.policyId).toBe(10);
    expect(validBalance.totalEntitlement).toBe(20);
    expect(validBalance.usedDays).toBe(5);
    expect(validBalance.pendingDays).toBe(2);
    expect(validBalance.availableDays).toBe(13);
    expect(validBalance.fiscalYear).toBe(2026);
    expect(validBalance.createdAt).toBeInstanceOf(Date);
    expect(validBalance.updatedAt).toBeInstanceOf(Date);
  });

  it('should support zero used and pending days', () => {
    const fresh: LeaveBalance = {
      ...validBalance,
      id: 2,
      usedDays: 0,
      pendingDays: 0,
      availableDays: 20,
    };
    expect(fresh.usedDays).toBe(0);
    expect(fresh.pendingDays).toBe(0);
    expect(fresh.availableDays).toBe(20);
  });

  it('should support fully exhausted balance', () => {
    const exhausted: LeaveBalance = {
      ...validBalance,
      id: 3,
      usedDays: 18,
      pendingDays: 2,
      availableDays: 0,
    };
    expect(exhausted.availableDays).toBe(0);
  });
});

describe('LeaveBalanceQueryParams', () => {
  it('should allow empty params', () => {
    const params: LeaveBalanceQueryParams = {};
    expect(params.employeeId).toBeUndefined();
    expect(params.policyId).toBeUndefined();
    expect(params.fiscalYear).toBeUndefined();
  });

  it('should accept all optional filters', () => {
    const params: LeaveBalanceQueryParams = {
      employeeId: 100,
      policyId: 10,
      fiscalYear: 2026,
    };
    expect(params.employeeId).toBe(100);
    expect(params.policyId).toBe(10);
    expect(params.fiscalYear).toBe(2026);
  });

  it('should accept partial filters', () => {
    const params: LeaveBalanceQueryParams = {
      employeeId: 100,
    };
    expect(params.employeeId).toBe(100);
    expect(params.policyId).toBeUndefined();
    expect(params.fiscalYear).toBeUndefined();
  });
});
