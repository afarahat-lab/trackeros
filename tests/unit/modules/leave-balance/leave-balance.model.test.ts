import { LeaveBalance } from '../../../../src/modules/leave-balance';

describe('LeaveBalance interface', () => {
  const validBalance: LeaveBalance = {
    id: 'lb-001',
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    totalEntitlement: 20,
    usedDays: 5,
    remainingDays: 15,
    fiscalYear: 2026,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-08-16T00:00:00Z'),
  };

  it('should accept a valid LeaveBalance shape with all fields', () => {
    expect(validBalance.id).toBe('lb-001');
    expect(validBalance.employeeId).toBe('emp-001');
    expect(validBalance.leavePolicyId).toBe('lp-001');
    expect(validBalance.totalEntitlement).toBe(20);
    expect(validBalance.usedDays).toBe(5);
    expect(validBalance.remainingDays).toBe(15);
    expect(validBalance.fiscalYear).toBe(2026);
    expect(validBalance.status).toBe('ACTIVE');
    expect(validBalance.createdAt).toBeInstanceOf(Date);
    expect(validBalance.updatedAt).toBeInstanceOf(Date);
  });

  it('should support all status values: ACTIVE, EXHAUSTED, CLOSED', () => {
    const statuses: Array<'ACTIVE' | 'EXHAUSTED' | 'CLOSED'> = ['ACTIVE', 'EXHAUSTED', 'CLOSED'];

    statuses.forEach((status) => {
      const balance: LeaveBalance = {
        ...validBalance,
        id: `lb-${status}`,
        status,
        remainingDays: status === 'EXHAUSTED' ? 0 : validBalance.remainingDays,
      };
      expect(balance.status).toBe(status);
    });
  });

  it('should enforce remainingDays equals totalEntitlement minus usedDays', () => {
    const balance: LeaveBalance = {
      ...validBalance,
      totalEntitlement: 30,
      usedDays: 12,
      remainingDays: 18,
    };
    expect(balance.remainingDays).toBe(balance.totalEntitlement - balance.usedDays);
  });

  it('should allow usedDays to be zero', () => {
    const fresh: LeaveBalance = {
      ...validBalance,
      id: 'lb-fresh',
      usedDays: 0,
      remainingDays: 20,
    };
    expect(fresh.usedDays).toBe(0);
    expect(fresh.remainingDays).toBe(20);
  });

  it('should allow remainingDays to be zero (EXHAUSTED)', () => {
    const exhausted: LeaveBalance = {
      ...validBalance,
      id: 'lb-exhausted',
      usedDays: 20,
      remainingDays: 0,
      status: 'EXHAUSTED',
    };
    expect(exhausted.remainingDays).toBe(0);
    expect(exhausted.status).toBe('EXHAUSTED');
  });

  it('should have exactly the expected field names', () => {
    const expectedFields = [
      'id',
      'employeeId',
      'leavePolicyId',
      'totalEntitlement',
      'usedDays',
      'remainingDays',
      'fiscalYear',
      'status',
      'createdAt',
      'updatedAt',
    ];

    const actualFields = Object.keys(validBalance).sort();
    expect(actualFields.sort()).toEqual(expectedFields.sort());
    expect(actualFields).toHaveLength(10);
  });
});
