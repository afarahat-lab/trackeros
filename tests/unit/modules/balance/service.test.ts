import { LeaveBalanceService, LeaveBalanceServiceImpl } from '../../../../src/modules/balance/balance.service';
import { LeaveBalanceRepository } from '../../../../src/modules/balance/balance.repository';

describe('LeaveBalanceService', () => {
  let mockLeaveBalanceRepo: jest.Mocked<LeaveBalanceRepository>;
  let service: LeaveBalanceService;

  beforeEach(() => {
    mockLeaveBalanceRepo = {
      findById: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByEmployeeId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    service = new LeaveBalanceServiceImpl(mockLeaveBalanceRepo);
  });

  it('should be instantiated', () => {
    expect(service).toBeDefined();
  });

  it('should have getBalance method', () => {
    expect(service.getBalance).toBeDefined();
  });

  it('should have calculateAvailableDays method', () => {
    expect(service.calculateAvailableDays).toBeDefined();
  });

  it('should have adjustBalance method', () => {
    expect(service.adjustBalance).toBeDefined();
  });
});
