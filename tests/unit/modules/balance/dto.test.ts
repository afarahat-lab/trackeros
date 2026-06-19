import { BalanceAdjustmentDto, LeaveBalanceDto } from '../../../../src/modules/balance/balance.dto';

describe('Balance DTOs', () => {
  describe('BalanceAdjustmentDto', () => {
    it('should accept valid required fields', () => {
      const dto: BalanceAdjustmentDto = {
        employeeId: 'emp-001',
        policyId: 'pol-001',
        fiscalYear: 2026,
        adjustmentType: 'accrual',
        days: 10,
      };
      expect(dto.employeeId).toBe('emp-001');
      expect(dto.policyId).toBe('pol-001');
      expect(dto.fiscalYear).toBe(2026);
      expect(dto.adjustmentType).toBe('accrual');
      expect(dto.days).toBe(10);
      expect(dto.notes).toBeUndefined();
    });

    it('should accept optional notes field', () => {
      const dto: BalanceAdjustmentDto = {
        employeeId: 'emp-001',
        policyId: 'pol-001',
        fiscalYear: 2026,
        adjustmentType: 'correction',
        days: -2,
        notes: 'Correcting over-accrual',
      };
      expect(dto.notes).toBe('Correcting over-accrual');
    });

    it('should accept all adjustmentType values', () => {
      const types: Array<'accrual' | 'usage' | 'correction'> = ['accrual', 'usage', 'correction'];
      types.forEach((type) => {
        const dto: BalanceAdjustmentDto = {
          employeeId: 'emp-001',
          policyId: 'pol-001',
          fiscalYear: 2026,
          adjustmentType: type,
          days: 1,
        };
        expect(dto.adjustmentType).toBe(type);
      });
    });
  });

  describe('LeaveBalanceDto', () => {
    it('should accept all fields', () => {
      const now = new Date();
      const dto: LeaveBalanceDto = {
        id: 'bal-001',
        employeeId: 'emp-001',
        policyId: 'pol-001',
        fiscalYear: 2026,
        accruedDays: 20,
        usedDays: 5,
        carriedOver: 3,
        balanceDays: 18,
        createdAt: now,
        updatedAt: now,
      };
      expect(dto.id).toBe('bal-001');
      expect(dto.employeeId).toBe('emp-001');
      expect(dto.policyId).toBe('pol-001');
      expect(dto.fiscalYear).toBe(2026);
      expect(dto.accruedDays).toBe(20);
      expect(dto.usedDays).toBe(5);
      expect(dto.carriedOver).toBe(3);
      expect(dto.balanceDays).toBe(18);
      expect(dto.createdAt).toBe(now);
      expect(dto.updatedAt).toBe(now);
    });
  });
});
