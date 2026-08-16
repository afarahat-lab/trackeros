import {
  LeaveBalanceRepository,
  ILeaveBalanceRepository,
  LeaveBalance,
} from '../../../../src/modules/leave-balance';

describe('LeaveBalanceRepository (stub)', () => {
  let repository: ILeaveBalanceRepository;

  const validCreateInput: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> = {
    employeeId: 'emp-001',
    leavePolicyId: 'lp-001',
    totalEntitlement: 20,
    usedDays: 0,
    remainingDays: 20,
    fiscalYear: 2026,
    status: 'ACTIVE',
  };

  beforeEach(() => {
    repository = new LeaveBalanceRepository();
  });

  describe('findById', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findById('lb-001')).rejects.toThrow('not implemented');
    });
  });

  describe('findByEmployeeAndPolicy', () => {
    it('should throw "not implemented"', async () => {
      await expect(
        repository.findByEmployeeAndPolicy('emp-001', 'lp-001', 2026),
      ).rejects.toThrow('not implemented');
    });
  });

  describe('findByEmployeeId', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findByEmployeeId('emp-001', 2026)).rejects.toThrow(
        'not implemented',
      );
    });
  });

  describe('create', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.create(validCreateInput)).rejects.toThrow('not implemented');
    });

    it('should accept input without id, createdAt, and updatedAt', async () => {
      const input: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeId: 'emp-002',
        leavePolicyId: 'lp-002',
        totalEntitlement: 10,
        usedDays: 3,
        remainingDays: 7,
        fiscalYear: 2026,
        status: 'ACTIVE',
      };

      await expect(repository.create(input)).rejects.toThrow('not implemented');
    });
  });

  describe('update', () => {
    it('should throw "not implemented"', async () => {
      await expect(
        repository.update('lb-001', { usedDays: 5, remainingDays: 15 }),
      ).rejects.toThrow('not implemented');
    });

    it('should accept a partial LeaveBalance update', async () => {
      const partialUpdate: Partial<LeaveBalance> = {
        usedDays: 10,
        remainingDays: 10,
        status: 'EXHAUSTED',
      };

      await expect(repository.update('lb-001', partialUpdate)).rejects.toThrow(
        'not implemented',
      );
    });

    it('should accept an empty partial update', async () => {
      await expect(repository.update('lb-001', {})).rejects.toThrow('not implemented');
    });
  });

  describe('interface contract', () => {
    it('should have all required methods', () => {
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByEmployeeAndPolicy).toBe('function');
      expect(typeof repository.findByEmployeeId).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.update).toBe('function');
    });
  });
});
