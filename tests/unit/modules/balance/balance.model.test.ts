import { LeaveBalance, CreateLeaveBalanceDto } from '../../../../src/modules/balance/balance.model';
import { LeaveType, LeaveBalanceStatus } from '../../../../src/shared/types/leave.types';

describe('LeaveBalance interface', () => {
  it('should allow a valid LeaveBalance object', () => {
    const now = new Date('2026-07-27T00:00:00.000Z');
    const balance: LeaveBalance = {
      id: 'bal-001',
      employeeId: 'emp-001',
      leaveType: LeaveType.ANNUAL,
      leavePolicyId: 'pol-001',
      entitled: 20,
      used: 5,
      pending: 2,
      carriedOver: 3,
      remaining: 16,
      year: 2026,
      status: LeaveBalanceStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };

    expect(balance.id).toBe('bal-001');
    expect(balance.employeeId).toBe('emp-001');
    expect(balance.leaveType).toBe(LeaveType.ANNUAL);
    expect(balance.leavePolicyId).toBe('pol-001');
    expect(balance.entitled).toBe(20);
    expect(balance.used).toBe(5);
    expect(balance.pending).toBe(2);
    expect(balance.carriedOver).toBe(3);
    expect(balance.remaining).toBe(16);
    expect(balance.year).toBe(2026);
    expect(balance.status).toBe(LeaveBalanceStatus.ACTIVE);
    expect(balance.createdAt).toEqual(now);
    expect(balance.updatedAt).toEqual(now);
  });

  it('should support all LeaveType values', () => {
    const types: LeaveType[] = [
      LeaveType.ANNUAL,
      LeaveType.SICK,
      LeaveType.EMERGENCY,
    ];

    expect(types).toHaveLength(3);
    expect(types).toContain(LeaveType.ANNUAL);
    expect(types).toContain(LeaveType.SICK);
    expect(types).toContain(LeaveType.EMERGENCY);
  });

  it('should support all LeaveBalanceStatus values', () => {
    const statuses: LeaveBalanceStatus[] = [
      LeaveBalanceStatus.ACTIVE,
      LeaveBalanceStatus.EXHAUSTED,
      LeaveBalanceStatus.EXPIRED,
    ];

    expect(statuses).toHaveLength(3);
    expect(statuses).toContain(LeaveBalanceStatus.ACTIVE);
    expect(statuses).toContain(LeaveBalanceStatus.EXHAUSTED);
    expect(statuses).toContain(LeaveBalanceStatus.EXPIRED);
  });

  it('should allow zero values for used, pending, and carriedOver', () => {
    const balance: LeaveBalance = {
      id: 'bal-002',
      employeeId: 'emp-002',
      leaveType: LeaveType.SICK,
      leavePolicyId: 'pol-002',
      entitled: 10,
      used: 0,
      pending: 0,
      carriedOver: 0,
      remaining: 10,
      year: 2026,
      status: LeaveBalanceStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(balance.used).toBe(0);
    expect(balance.pending).toBe(0);
    expect(balance.carriedOver).toBe(0);
    expect(balance.remaining).toBe(10);
  });

  it('should allow EXHAUSTED status when remaining is zero', () => {
    const balance: LeaveBalance = {
      id: 'bal-003',
      employeeId: 'emp-003',
      leaveType: LeaveType.ANNUAL,
      leavePolicyId: 'pol-001',
      entitled: 20,
      used: 20,
      pending: 0,
      carriedOver: 0,
      remaining: 0,
      year: 2026,
      status: LeaveBalanceStatus.EXHAUSTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(balance.remaining).toBe(0);
    expect(balance.status).toBe(LeaveBalanceStatus.EXHAUSTED);
  });
});

describe('CreateLeaveBalanceDto', () => {
  it('should allow a valid CreateLeaveBalanceDto object', () => {
    const dto: CreateLeaveBalanceDto = {
      employeeId: 'emp-001',
      leaveType: LeaveType.ANNUAL,
      leavePolicyId: 'pol-001',
      entitled: 20,
      used: 0,
      pending: 0,
      carriedOver: 0,
      remaining: 20,
      year: 2026,
      status: LeaveBalanceStatus.ACTIVE,
    };

    expect(dto.employeeId).toBe('emp-001');
    expect(dto.leaveType).toBe(LeaveType.ANNUAL);
    expect(dto.leavePolicyId).toBe('pol-001');
    expect(dto.entitled).toBe(20);
    expect(dto.used).toBe(0);
    expect(dto.pending).toBe(0);
    expect(dto.carriedOver).toBe(0);
    expect(dto.remaining).toBe(20);
    expect(dto.year).toBe(2026);
    expect(dto.status).toBe(LeaveBalanceStatus.ACTIVE);
  });
});
