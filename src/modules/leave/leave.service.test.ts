import { LeaveService } from './leave.service';
import { ILeaveRepository } from './leave.repository';
import { ILeaveBalanceRepository } from '../balance/balance.repository';
import { ILeavePolicyRepository } from '../policy/policy.repository';
import { IEmployeeService } from '../employee/employee.service';
import { INotificationService } from '../notification/notification.service';
import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto } from './leave.model';

describe('LeaveService', () => {
  let service: LeaveService;
  let mockLeaveRepository: jest.Mocked<ILeaveRepository>;
  let mockLeaveBalanceRepository: jest.Mocked<ILeaveBalanceRepository>;
  let mockLeavePolicyRepository: jest.Mocked<ILeavePolicyRepository>;
  let mockEmployeeService: jest.Mocked<IEmployeeService>;
  let mockNotificationService: jest.Mocked<INotificationService>;

  beforeEach(() => {
    mockLeaveRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByQuery: jest.fn(),
      updateStatus: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockLeaveBalanceRepository = {
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByEmployeeAndPolicy: jest.fn(),
      findByQuery: jest.fn(),
      updateBalance: jest.fn(),
      create: jest.fn(),
    };
    mockLeavePolicyRepository = {
      findById: jest.fn(),
      findByPolicyName: jest.fn(),
      findByQuery: jest.fn(),
      findAllActive: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockEmployeeService = {
      getEmployeeById: jest.fn(),
      getManagerByEmployeeId: jest.fn(),
    };
    mockNotificationService = {
      createNotification: jest.fn(),
    };

    service = new LeaveService(
      mockLeaveRepository,
      mockLeaveBalanceRepository,
      mockLeavePolicyRepository,
      mockEmployeeService,
      mockNotificationService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLeaveRequestById', () => {
    it('should return leave request found by id', async () => {
      const mockRequest: LeaveRequest = {
        id: '1',
        employeeId: 'emp1',
        policyId: 'pol1',
        startDate: new Date(),
        endDate: new Date(),
        durationDays: 5,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockLeaveRepository.findById.mockResolvedValue(mockRequest);

      const result = await service.getLeaveRequestById('1');

      expect(result).toEqual(mockRequest);
      expect(mockLeaveRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should return null if not found', async () => {
      mockLeaveRepository.findById.mockResolvedValue(null);

      const result = await service.getLeaveRequestById('999');

      expect(result).toBeNull();
    });
  });

  describe('getLeaveRequestsByEmployee', () => {
    it('should return leave requests for employee', async () => {
      const mockRequests: LeaveRequest[] = [];
      mockLeaveRepository.findByEmployeeId.mockResolvedValue(mockRequests);

      const result = await service.getLeaveRequestsByEmployee('emp1');

      expect(result).toEqual(mockRequests);
      expect(mockLeaveRepository.findByEmployeeId).toHaveBeenCalledWith('emp1');
    });
  });

  describe('createLeaveRequest', () => {
    it('should throw Not implemented', async () => {
      const dto: CreateLeaveRequestDto = {
        employeeId: 'emp1',
        policyId: 'pol1',
        startDate: new Date(),
        endDate: new Date(),
        durationDays: 5,
      };
      await expect(service.createLeaveRequest(dto)).rejects.toThrow('Not implemented');
    });
  });

  describe('submitLeaveRequest', () => {
    it('should throw Not implemented', async () => {
      await expect(service.submitLeaveRequest('1', 'emp1')).rejects.toThrow('Not implemented');
    });
  });

  describe('updateLeaveRequest', () => {
    it('should throw Not implemented', async () => {
      const dto: UpdateLeaveRequestDto = { reason: 'Updated' };
      await expect(service.updateLeaveRequest('1', dto)).rejects.toThrow('Not implemented');
    });
  });

  describe('cancelLeaveRequest', () => {
    it('should throw Not implemented', async () => {
      await expect(service.cancelLeaveRequest('1', 'emp1')).rejects.toThrow('Not implemented');
    });
  });
});
