import { LeaveBalance } from '../../../../src/modules/balance/balance.model';
import { LeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';

describe('LeaveBalance Model and Repository', () => {
  it('should define LeaveBalance interface with correct fields', () => {
    const balance: LeaveBalance = {
      id: '1',
      employeeId: 'emp1',
      policyId: 'pol1',
      fiscalYear: 2024,
      accruedDays: 15.5,
      usedDays: 5.0,
      carriedOver: 2.0,
      balanceDays: 12.5,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    expect(balance).toBeDefined();
    expect(balance.fiscalYear).toBe(2024);
  });

  it('should define LeaveBalanceRepository interface with required methods', () => {
    const repository: LeaveBalanceRepository = {
      findById: async (id: string) => null,
      findByEmployeeAndPolicy: async (employeeId: string, policyId: string, fiscalYear: number) => null,
      findByEmployeeId: async (employeeId: string) => [],
      save: async (balance) => ({ ...balance, id: '1', createdAt: new Date(), updatedAt: new Date() }),
      update: async (id, updates) => null
    };
    
    expect(repository).toBeDefined();
    expect(repository.findById).toBeDefined();
    expect(repository.findByEmployeeAndPolicy).toBeDefined();
    expect(repository.findByEmployeeId).toBeDefined();
    expect(repository.save).toBeDefined();
    expect(repository.update).toBeDefined();
  });
});
