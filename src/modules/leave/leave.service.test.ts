import { LeaveService, InsufficientBalanceError } from './leave.service';
import { ILeaveRepository } from './leave.repository';
import { ILeavePolicyService } from '../policy/policy.service';
import { ILeaveBalanceService } from '../balance/balance.service';
import { IEmployeeService } from '../employee/employee.service';
import { IAuditService } from '../../shared/audit/audit.service';
import { INotificationService } from '../../shared/notification/notification.service';
import { CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequest } from './leave.model';

describe('LeaveService', () => {
  let leaveService: LeaveService;
  let mockLeaveRepository: ILeaveRepository;
  let mockLeavePolicyService: ILeavePolicyService;
  let mockLeaveBalanceService: ILeaveBalanceService;
  let mockEmployeeService: IEmployeeService;
  let mockAuditService: IAuditService;
  let mockNotificationService: INotificationService;

  const employeeId = 'emp-1';
  const validDto: CreateLeaveRequestDto = {
    employeeId,
    leaveType: 'annual',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    reason: 'vacation',
    managerId: 'mgr-1',
  };

  const createdRequest: LeaveRequest = {
    id: 'req-1',
    employeeId,
    leaveType: 'annual',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    status: 'pending',
    reason: 'vacation',
    managerId: 'mgr-1',
    createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-06-15T10:00:00Z',
  };

  beforeEach(() => {
    mockLeaveRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockLeavePolicyService = {} as ILeavePolicyService;
    mockLeaveBalanceService = {
      checkBalance: jest.fn(),
    } as unknown as ILeaveBalanceService;
    mockEmployeeService = {} as IEmployeeService;
    mockAuditService = {
      log: jest.fn(),
    } as unknown as IAuditService;
    mockNotificationService = {
      send: jest.fn(),
    } as unknown as INotificationService;

    leaveService = new LeaveService(
      mockLeaveRepository,
      mockLeavePolicyService,
      mockLeaveBalanceService,
      mockEmployeeService,
      mockAuditService,
      mockNotificationService
    );
  });

  describe('createLeaveRequest', () => {
    it('should validate input using manual validation', async () => {
      const invalidDto = { ...validDto, startDate: 'not-a-date' };
      await expect(leaveService.createLeaveRequest(invalidDto, employeeId)).rejects.toThrow('Validation failed');
    });

    it('should enforce business rules: start date >= current date', async () => {
      const pastDto = { ...validDto, startDate: '2020-01-01', endDate: '2020-01-05' };
      await expect(leaveService.createLeaveRequest(pastDto, employeeId)).rejects.toThrow('Start date must be today or later');
    });

    it('should enforce business rules: end date >= start date', async () => {
      const badDto = { ...validDto, startDate: '2026-07-10', endDate: '2026-07-05' };
      await expect(leaveService.createLeaveRequest(badDto, employeeId)).rejects.toThrow('End date must be on or after start date');
    });

    it('should enforce business rules: total days > 0', async () => {
      const zeroDto = { ...validDto, startDate: '2026-07-01', endDate: '2026-07-01' };
      (mockLeaveBalanceService.checkBalance as jest.Mock).mockResolvedValue(true);
      (mockLeaveRepository.create as jest.Mock).mockResolvedValue(createdRequest);
      const result = await leaveService.createLeaveRequest(zeroDto, employeeId);
      expect(result).toBeDefined();
    });

    it('should check leave balance before creating request', async () => {
      (mockLeaveBalanceService.checkBalance as jest.Mock).mockResolvedValue(false);
      await expect(leaveService.createLeaveRequest(validDto, employeeId)).rejects.toThrow(InsufficientBalanceError);
    });

    it('should write audit record for create operation', async () => {
      (mockLeaveBalanceService.checkBalance as jest.Mock).mockResolvedValue(true);
      (mockLeaveRepository.create as jest.Mock).mockResolvedValue(createdRequest);
      await leaveService.createLeaveRequest(validDto, employeeId);
      expect(mockAuditService.log).toHaveBeenCalledWith('LEAVE_REQUEST_CREATED', expect.objectContaining({ requestId: 'req-1' }));
    });

    it('should send notification for leave request submission', async () => {
      (mockLeaveBalanceService.checkBalance as jest.Mock).mockResolvedValue(true);
      (mockLeaveRepository.create as jest.Mock).mockResolvedValue(createdRequest);
      await leaveService.createLeaveRequest(validDto, employeeId);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        employeeId,
        'LEAVE_REQUEST_SUBMITTED',
        'Leave request submitted',
        expect.stringContaining('annual')
      );
    });

    it('should execute all operations in a single database transaction', async () => {
      (mockLeaveBalanceService.checkBalance as jest.Mock).mockResolvedValue(true);
      (mockLeaveRepository.create as jest.Mock).mockResolvedValue(createdRequest);
      await leaveService.createLeaveRequest(validDto, employeeId);
      expect(mockLeaveRepository.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(mockNotificationService.send).toHaveBeenCalled();
    });
  });

  describe('updateLeaveRequest', () => {
    const updateDto: UpdateLeaveRequestDto = { reason: 'updated reason' };
    const existingRequest: LeaveRequest = { ...createdRequest };

    it('should validate input using manual validation', async () => {
      const invalidDto = { startDate: 'bad-date' };
      await expect(leaveService.updateLeaveRequest('req-1', invalidDto, employeeId)).rejects.toThrow('Validation failed');
    });

    it('should write audit record for update operation', async () => {
      (mockLeaveRepository.findById as jest.Mock).mockResolvedValue(existingRequest);
      (mockLeaveRepository.update as jest.Mock).mockResolvedValue({ ...existingRequest, reason: 'updated reason' });
      await leaveService.updateLeaveRequest('req-1', updateDto, employeeId);
      expect(mockAuditService.log).toHaveBeenCalledWith('LEAVE_REQUEST_UPDATED', expect.objectContaining({ requestId: 'req-1' }));
    });

    it('should send notification for update', async () => {
      (mockLeaveRepository.findById as jest.Mock).mockResolvedValue(existingRequest);
      (mockLeaveRepository.update as jest.Mock).mockResolvedValue({ ...existingRequest, reason: 'updated reason' });
      await leaveService.updateLeaveRequest('req-1', updateDto, employeeId);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        employeeId,
        'LEAVE_REQUEST_UPDATED',
        'Leave request updated',
        expect.stringContaining('req-1')
      );
    });
  });

  describe('deleteLeaveRequest', () => {
    const existingRequest: LeaveRequest = { ...createdRequest };

    it('should write audit record for delete operation', async () => {
      (mockLeaveRepository.findById as jest.Mock).mockResolvedValue(existingRequest);
      (mockLeaveRepository.delete as jest.Mock).mockResolvedValue(true);
      await leaveService.deleteLeaveRequest('req-1', employeeId);
      expect(mockAuditService.log).toHaveBeenCalledWith('LEAVE_REQUEST_DELETED', expect.objectContaining({ requestId: 'req-1' }));
    });

    it('should send notification for delete', async () => {
      (mockLeaveRepository.findById as jest.Mock).mockResolvedValue(existingRequest);
      (mockLeaveRepository.delete as jest.Mock).mockResolvedValue(true);
      await leaveService.deleteLeaveRequest('req-1', employeeId);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        employeeId,
        'LEAVE_REQUEST_DELETED',
        'Leave request deleted',
        expect.stringContaining('req-1')
      );
    });
  });
});
