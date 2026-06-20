import { LeaveService } from '../../../../src/modules/leave/leave.service';
import { LeaveStatus, AppError } from '../../../../src/shared/types/index';

const mockLeaveRequestRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmployeeId: jest.fn(),
  findByManagerId: jest.fn(),
  updateStatus: jest.fn(),
};

const mockBalanceService = {
  getBalance: jest.fn(),
  updateBalance: jest.fn(),
};

const mockEmployeeService = {
  getEmployee: jest.fn(),
};

const mockPolicyService = {
  getPolicy: jest.fn(),
};

const mockNotificationService = {
  createNotification: jest.fn(),
};

const mockAuditService = {
  logAction: jest.fn(),
};

describe('LeaveService', () => {
  let service: LeaveService;

  beforeEach(() => {
    service = new LeaveService(
      mockLeaveRequestRepo as any,
      mockBalanceService as any,
      mockEmployeeService as any,
      mockPolicyService as any,
      mockNotificationService as any,
      mockAuditService as any
    );
    jest.clearAllMocks();
  });

  describe('createLeaveRequest', () => {
    it('should create a leave request successfully', async () => {
      mockEmployeeService.getEmployee.mockResolvedValue({ id: 'emp1', role: 'employee' });
      mockPolicyService.getPolicy.mockResolvedValue({ id: 'pol1' });
      mockLeaveRequestRepo.create.mockResolvedValue({ id: 'req1', status: LeaveStatus.Pending });

      const result = await service.createLeaveRequest('emp1', 'pol1', new Date(), new Date());

      expect(result.status).toBe(LeaveStatus.Pending);
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    it('should throw if employee not found', async () => {
      mockEmployeeService.getEmployee.mockResolvedValue(null);
      await expect(service.createLeaveRequest('emp1', 'pol1', new Date(), new Date())).rejects.toThrow(AppError);
    });
  });

  describe('approveLeaveRequest', () => {
    it('should approve request and deduct balance', async () => {
      const request = { id: 'req1', employeeId: 'emp1', leaveTypeId: 'pol1', startDate: new Date(), endDate: new Date(), status: LeaveStatus.Pending };
      mockLeaveRequestRepo.findById.mockResolvedValue(request);
      mockEmployeeService.getEmployee.mockResolvedValue({ id: 'mgr1', role: 'manager' });
      mockBalanceService.getBalance.mockResolvedValue({ daysAllocated: 10, daysUsed: 2 });
      mockLeaveRequestRepo.updateStatus.mockResolvedValue({ ...request, status: LeaveStatus.Approved });

      const result = await service.approveLeaveRequest('req1', 'mgr1');

      expect(result.status).toBe(LeaveStatus.Approved);
      expect(mockBalanceService.updateBalance).toHaveBeenCalled();
    });

    it('should throw if insufficient balance', async () => {
      const request = { id: 'req1', employeeId: 'emp1', leaveTypeId: 'pol1', startDate: new Date(), endDate: new Date(), status: LeaveStatus.Pending };
      mockLeaveRequestRepo.findById.mockResolvedValue(request);
      mockEmployeeService.getEmployee.mockResolvedValue({ id: 'mgr1', role: 'manager' });
      mockBalanceService.getBalance.mockResolvedValue({ daysAllocated: 10, daysUsed: 10 });

      await expect(service.approveLeaveRequest('req1', 'mgr1')).rejects.toThrow('Insufficient leave balance');
    });
  });

  describe('cancelLeaveRequest', () => {
    it('should restore balance if cancelling an approved request', async () => {
      const request = { id: 'req1', employeeId: 'emp1', leaveTypeId: 'pol1', startDate: new Date(), endDate: new Date(), status: LeaveStatus.Approved };
      mockLeaveRequestRepo.findById.mockResolvedValue(request);
      mockBalanceService.getBalance.mockResolvedValue({ daysAllocated: 10, daysUsed: 5 });
      mockLeaveRequestRepo.updateStatus.mockResolvedValue({ ...request, status: LeaveStatus.Rejected });

      await service.cancelLeaveRequest('req1', 'emp1');

      expect(mockBalanceService.updateBalance).toHaveBeenCalledWith('emp1', 'pol1', expect.any(Number), 4);
    });
  });
});
