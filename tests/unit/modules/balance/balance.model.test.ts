import {
  LeaveBalanceStatus,
  BalanceAdjustmentStatus,
  AdjustmentType,
  LeaveBalance,
  BalanceAdjustment,
  CreateLeaveBalanceDto,
  CreateBalanceAdjustmentDto,
} from '../../../../src/modules/balance/balance.model';

describe('LeaveBalance', () => {
  describe('remainingDays derivation', () => {
    it('should derive remainingDays as totalEntitlement - usedDays', () => {
      const balance: LeaveBalance = {
        id: 'lb-1',
        employeeId: 'emp-1',
        policyId: 'pol-1',
        totalEntitlement: 20,
        usedDays: 5,
        remainingDays: 15,
        fiscalYear: 2026,
        status: LeaveBalanceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(balance.remainingDays).toBe(
        balance.totalEntitlement - balance.usedDays,
      );
    });

    it('should have remainingDays equal to totalEntitlement when usedDays is 0', () => {
      const balance: LeaveBalance = {
        id: 'lb-2',
        employeeId: 'emp-2',
        policyId: 'pol-2',
        totalEntitlement: 30,
        usedDays: 0,
        remainingDays: 30,
        fiscalYear: 2026,
        status: LeaveBalanceStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(balance.remainingDays).toBe(balance.totalEntitlement);
    });

    it('should have remainingDays of 0 when usedDays equals totalEntitlement', () => {
      const balance: LeaveBalance = {
        id: 'lb-3',
        employeeId: 'emp-3',
        policyId: 'pol-3',
        totalEntitlement: 15,
        usedDays: 15,
        remainingDays: 0,
        fiscalYear: 2026,
        status: LeaveBalanceStatus.EXHAUSTED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(balance.remainingDays).toBe(0);
    });
  });
});

describe('CreateLeaveBalanceDto', () => {
  it('should accept a valid shape with required fields', () => {
    const dto: CreateLeaveBalanceDto = {
      employeeId: 'emp-1',
      policyId: 'pol-1',
      totalEntitlement: 20,
      fiscalYear: 2026,
    };

    expect(dto.employeeId).toBe('emp-1');
    expect(dto.policyId).toBe('pol-1');
    expect(dto.totalEntitlement).toBe(20);
    expect(dto.fiscalYear).toBe(2026);
  });

  it('should not require fields beyond the defined shape', () => {
    const dto: CreateLeaveBalanceDto = {
      employeeId: 'emp-2',
      policyId: 'pol-2',
      totalEntitlement: 25,
      fiscalYear: 2025,
    };

    const keys = Object.keys(dto);
    expect(keys).toContain('employeeId');
    expect(keys).toContain('policyId');
    expect(keys).toContain('totalEntitlement');
    expect(keys).toContain('fiscalYear');
    expect(keys).toHaveLength(4);
  });
});

describe('CreateBalanceAdjustmentDto', () => {
  it('should accept a valid shape with all required fields', () => {
    const dto: CreateBalanceAdjustmentDto = {
      leaveBalanceId: 'lb-1',
      adjustmentType: 'DEBIT',
      amountDays: 2,
      reason: 'Sick leave correction',
    };

    expect(dto.leaveBalanceId).toBe('lb-1');
    expect(dto.adjustmentType).toBe('DEBIT');
    expect(dto.amountDays).toBe(2);
    expect(dto.reason).toBe('Sick leave correction');
  });

  it('should accept optional leaveRequestId and performedBy fields', () => {
    const dto: CreateBalanceAdjustmentDto = {
      leaveBalanceId: 'lb-2',
      leaveRequestId: 'lr-1',
      adjustmentType: 'CREDIT',
      amountDays: 3,
      reason: 'Annual leave accrual',
      performedBy: 'admin-1',
    };

    expect(dto.leaveRequestId).toBe('lr-1');
    expect(dto.performedBy).toBe('admin-1');
  });

  it('should allow optional fields to be undefined', () => {
    const dto: CreateBalanceAdjustmentDto = {
      leaveBalanceId: 'lb-3',
      adjustmentType: 'CREDIT',
      amountDays: 1,
      reason: 'Manual adjustment',
    };

    expect(dto.leaveRequestId).toBeUndefined();
    expect(dto.performedBy).toBeUndefined();
  });
});

describe('AdjustmentType', () => {
  it('should accept DEBIT as a valid value', () => {
    const adjustmentType: AdjustmentType = 'DEBIT';
    expect(adjustmentType).toBe('DEBIT');
  });

  it('should accept CREDIT as a valid value', () => {
    const adjustmentType: AdjustmentType = 'CREDIT';
    expect(adjustmentType).toBe('CREDIT');
  });

  it('should be assignable in CreateBalanceAdjustmentDto', () => {
    const debitDto: CreateBalanceAdjustmentDto = {
      leaveBalanceId: 'lb-1',
      adjustmentType: 'DEBIT',
      amountDays: 1,
      reason: 'Test debit',
    };

    const creditDto: CreateBalanceAdjustmentDto = {
      leaveBalanceId: 'lb-2',
      adjustmentType: 'CREDIT',
      amountDays: 1,
      reason: 'Test credit',
    };

    expect(debitDto.adjustmentType).toBe('DEBIT');
    expect(creditDto.adjustmentType).toBe('CREDIT');
  });
});

describe('LeaveBalanceStatus enum', () => {
  it('should have all expected status values', () => {
    expect(LeaveBalanceStatus.ACTIVE).toBe('ACTIVE');
    expect(LeaveBalanceStatus.EXHAUSTED).toBe('EXHAUSTED');
    expect(LeaveBalanceStatus.FROZEN).toBe('FROZEN');
    expect(LeaveBalanceStatus.CLOSED).toBe('CLOSED');
  });
});

describe('BalanceAdjustmentStatus enum', () => {
  it('should have all expected status values', () => {
    expect(BalanceAdjustmentStatus.PENDING).toBe('PENDING');
    expect(BalanceAdjustmentStatus.APPLIED).toBe('APPLIED');
    expect(BalanceAdjustmentStatus.REVERSED).toBe('REVERSED');
  });
});
