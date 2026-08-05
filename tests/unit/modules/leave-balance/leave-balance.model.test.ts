import { LeaveBalance, LeaveBalanceStatus } from 'modules/leave-balance';

describe('LeaveBalance model', () => {
  const validBalance: LeaveBalance = {
    id: 'lb-001',
    employeeId: 'emp-001',
    policyId: 'lp-001',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-06-15T12:00:00Z'),
  };

  it('should create a valid LeaveBalance with all required fields', () => {
    expect(validBalance.id).toBe('lb-001');
    expect(validBalance.employeeId).toBe('emp-001');
    expect(validBalance.policyId).toBe('lp-001');
    expect(validBalance.totalEntitlement).toBe(20);
    expect(validBalance.usedDays).toBe(5);
    expect(validBalance.remainingDays).toBe(15);
    expect(validBalance.fiscalYear).toBe(2026);
    expect(validBalance.status).toBe('ACTIVE');
    expect(validBalance.createdAt).toBeInstanceOf(Date);
    expect(validBalance.updatedAt).toBeInstanceOf(Date);
  });

  it('should enforce remainingDays = totalEntitlement - usedDays invariant', () => {
    const balance: LeaveBalance = {
      ...validBalance,
      totalEntitlement: 30,
      usedDays: 10,
      remainingDays: 20,
    };
    expect(balance.remainingDays).toBe(balance.totalEntitlement - balance.usedDays);
  });

  it('should accept all valid LeaveBalanceStatus values', () => {
    const statuses: LeaveBalanceStatus[] = ['ACTIVE', 'CLOSED', 'FORECAST'];
    for (const status of statuses) {
      const balance: LeaveBalance = { ...validBalance, status };
      expect(balance.status).toBe(status);
    }
  });

  it('should support fiscalYear as a numeric year', () => {
    const balance: LeaveBalance = { ...validBalance, fiscalYear: 2027 };
    expect(balance.fiscalYear).toBe(2027);
    expect(typeof balance.fiscalYear).toBe('number');
  });

  it('should have exactly the fields specified in the canonical shape', () => {
    const expectedFields = [
      'id',
      'employeeId',
      'policyId',
      'totalEntitlement',
      'usedDays',
      'remainingDays',
      'fiscalYear',
      'status',
      'createdAt',
      'updatedAt',
    ];
    const actualFields = Object.keys(validBalance);
    expect(actualFields.sort()).toEqual(expectedFields.sort());
  });
});
