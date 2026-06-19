import { LeaveBalanceDto, UpdateLeaveBalanceDto } from '../../../../src/modules/balance/dto/create-balance.dto';

describe('Balance DTOs', () => {
  it('should allow valid LeaveBalanceDto', () => {
    const dto: LeaveBalanceDto = {
      id: 'bal-1',
      employeeId: 'emp-1',
      policyId: 'pol-1',
      fiscalYear: 2026,
      accruedDays: 20,
      usedDays: 5,
      carriedOver: 2,
      balanceDays: 17,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(dto.id).toBe('bal-1');
  });

  it('should allow partial UpdateLeaveBalanceDto', () => {
    const dto: UpdateLeaveBalanceDto = {
      usedDays: 10,
    };
    expect(dto.usedDays).toBe(10);
  });
});
