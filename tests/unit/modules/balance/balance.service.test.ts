import { BalanceService } from "../../../../src/modules/balance/balance.service";
import { IBalanceRepository } from "../../../../src/modules/balance/balance.repository.interface";
import { LeaveBalance, AppError } from "../../../../src/shared/types";

describe("BalanceService", () => {
  let service: BalanceService;
  let mockRepo: jest.Mocked<IBalanceRepository>;

  beforeEach(() => {
    mockRepo = {
      findByEmployeeAndTypeAndYear: jest.fn(),
      findByEmployee: jest.fn(),
      updateBalance: jest.fn(),
    };
    service = new BalanceService(mockRepo);
  });

  describe("getBalance", () => {
    it("should return balance when found", async () => {
      const mockBalance = { id: '1', employeeId: 'e1', leaveTypeId: 'l1', year: 2023, daysAllocated: 10, daysUsed: 2 } as LeaveBalance;
      mockRepo.findByEmployeeAndTypeAndYear.mockResolvedValue(mockBalance);
      
      const result = await service.getBalance('e1', 'l1', 2023);
      expect(result).toEqual(mockBalance);
    });

    it("should throw AppError when repo fails", async () => {
      mockRepo.findByEmployeeAndTypeAndYear.mockRejectedValue(new Error("DB error"));
      
      await expect(service.getBalance('e1', 'l1', 2023)).rejects.toThrow(AppError);
    });
  });

  describe("getBalancesForEmployee", () => {
    it("should return balances for employee", async () => {
      const mockBalances = [{ id: '1', employeeId: 'e1', leaveTypeId: 'l1', year: 2023, daysAllocated: 10, daysUsed: 2 }] as LeaveBalance[];
      mockRepo.findByEmployee.mockResolvedValue(mockBalances);
      
      const result = await service.getBalancesForEmployee('e1');
      expect(result).toEqual(mockBalances);
    });

    it("should handle empty result", async () => {
      mockRepo.findByEmployee.mockResolvedValue([]);
      
      const result = await service.getBalancesForEmployee('e1');
      expect(result).toEqual([]);
    });
  });

  describe("updateBalance", () => {
    it("should update and return balance", async () => {
      const mockBalance = { id: '1', employeeId: 'e1', leaveTypeId: 'l1', year: 2023, daysAllocated: 10, daysUsed: 5 } as LeaveBalance;
      mockRepo.updateBalance.mockResolvedValue(mockBalance);
      
      const result = await service.updateBalance('e1', 'l1', 2023, 5);
      expect(result).toEqual(mockBalance);
    });
  });
});
