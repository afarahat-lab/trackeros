import { LeaveService } from '../../../../src/modules/leave/leave.service';
import { LeaveRequestStatus, CreateLeaveRequestDto } from '../../../../src/modules/leave/leave.model';
import { AppError } from '../../../../src/shared/types';

describe('LeaveService', () => {
  let leaveService: LeaveService;

  const mockLeaveRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmployeeId: jest.fn(),
    findByManagerId: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockEmployeeService = {
    getEmployeeById: jest.fn(),
    isManagerOf: jest.fn(),
  };

  const mockPolicyService = {
    getPolicyByLeaveTypeId: jest.fn(),
  };

  const mockBalanceService = {
    getBalance: jest.fn(),
    updateBalance: jest.fn(),
  };

  const mockNotificationRepo = {
    create: jest.fn(),
  };

  const mockAuditRepo = {
    create: jest.fn(),
  };

  const mockEmployee = { id: 'emp1', name: 'Test', email: 'test@test.com', managerId: 'mgr1', department: 'IT' };
  
  const mockPolicy = { 
    id: 'pol1', 
    leaveTypeId: 'lt1', 
    maxDaysPerYear: 20, 
    maxConsecutiveDays: 5, 
    requiresApproval: true, 
    allowNegativeBalance: false, 
    blackoutDates: [new Date(2023, 11, 25)], 
    status: 'active' 
  };
  
  const mockBalance = { id: 'bal1', employeeId: 'emp1', leaveTypeId: 'lt1', year: 2023, totalDays: 20, usedDays: 5 };
  
  const mockLeaveRequest: any = {
    id: 'lr1',
    employeeId: 'emp1',
    leaveTypeId: 'lt1',
    startDate: new Date(2023, 9, 1),
    endDate: new Date(2023, 9, 3),
    daysRequested: 3,
    status: LeaveRequestStatus.DRAFT,
    reason: 'Vacation',
    managerId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    leaveService = new LeaveService(
      mockLeaveRepo as any,
      mockEmployeeService as any,
      mockPolicyService as any,
      mockBalanceService as any,
      mockNotificationRepo as any,
      mockAuditRepo as any
    );
  });

  describe('createDraftLeaveRequest', () => {
    it('should create a draft leave request', async () => {
      const dto: CreateLeaveRequestDto = { 
        employeeId: 'emp1', 
        leaveTypeId: 'lt1', 
        startDate: new Date(), 
        endDate: new Date(), 
        daysRequested: 1 
      };
      mockEmployeeService.getEmployeeById.mockResolvedValue(mockEmployee);
      mockPolicyService.getPolicyByLeaveTypeId.mockResolvedValue(mockPolicy);
      mockLeaveRepo.create.mockResolvedValue(mockLeaveRequest);
      mockAuditRepo.create.mockResolvedValue({});

      const result = await leaveService.createDraftLeaveRequest(dto);

      expect(result).toEqual(mockLeaveRequest);
      expect(mockEmployeeService.getEmployeeById).toHaveBeenCalledWith('emp1');
      expect(mockPolicyService.getPolicyByLeaveTypeId).toHaveBeenCalledWith('lt1');
      expect(mockLeaveRepo.create).toHaveBeenCalledWith(dto);
      expect(mockAuditRepo.create).toHaveBeenCalled();
    });
  });

  describe('submitLeaveRequest', () => {
    it('should submit a leave request, validate policies, send notifications, write audit', async () => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockPolicyService.getPolicyByLeaveTypeId.mockResolvedValue(mockPolicy);
      const updatedReq = { ...mockLeaveRequest, status: LeaveRequestStatus.SUBMITTED };
      mockLeaveRepo.updateStatus.mockResolvedValue(updatedReq);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      const result = await leaveService.submitLeaveRequest('lr1', 'emp1');

      expect(result.status).toBe(LeaveRequestStatus.SUBMITTED);
      expect(mockLeaveRepo.updateStatus).toHaveBeenCalledWith('lr1', LeaveRequestStatus.SUBMITTED);
      expect(mockAuditRepo.create).toHaveBeenCalled();
      expect(mockNotificationRepo.create).toHaveBeenCalled();
    });

    it('should throw 404 if leave request not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);
      await expect(leaveService.submitLeaveRequest('lr1', 'emp1')).rejects.toThrow(AppError);
    });

    it('should throw 403 if unauthorized employee', async () => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      await expect(leaveService.submitLeaveRequest('lr1', 'emp2')).rejects.toThrow(AppError);
    });

    it('should throw 400 if invalid status transition', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: LeaveRequestStatus.SUBMITTED });
      await expect(leaveService.submitLeaveRequest('lr1', 'emp1')).rejects.toThrow(AppError);
    });

    it('should throw 400 if exceeds max consecutive days', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, daysRequested: 10 });
      mockPolicyService.getPolicyByLeaveTypeId.mockResolvedValue(mockPolicy);
      await expect(leaveService.submitLeaveRequest('lr1', 'emp1')).rejects.toThrow(AppError);
    });

    it('should throw 400 if exceeds max days per year', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, daysRequested: 25 });
      mockPolicyService.getPolicyByLeaveTypeId.mockResolvedValue({ ...mockPolicy, maxConsecutiveDays: 30 });
      await expect(leaveService.submitLeaveRequest('lr1', 'emp1')).rejects.toThrow(AppError);
    });

    it('should throw 400 if blackout dates', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, startDate: new Date(2023, 11, 24), endDate: new Date(2023, 11, 26) });
      mockPolicyService.getPolicyByLeaveTypeId.mockResolvedValue(mockPolicy);
      await expect(leaveService.submitLeaveRequest('lr1', 'emp1')).rejects.toThrow(AppError);
    });
  });

  describe('approveLeaveRequest', () => {
    it('should approve, deduct balance, send notifications, write audit', async () => {
      const submittedReq = { ...mockLeaveRequest, status: LeaveRequestStatus.SUBMITTED };
      mockLeaveRepo.findById.mockResolvedValue(submittedReq);
      mockEmployeeService.isManagerOf.mockResolvedValue(true);
      mockBalanceService.getBalance.mockResolvedValue(mockBalance);
      const updatedReq = { ...submittedReq, status: LeaveRequestStatus.APPROVED };
      mockLeaveRepo.updateStatus.mockResolvedValue(updatedReq);
      mockBalanceService.updateBalance.mockResolvedValue({ ...mockBalance, usedDays: 8 });
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      const result = await leaveService.approveLeaveRequest('lr1', 'mgr1');

      expect(result.status).toBe(LeaveRequestStatus.APPROVED);
      expect(mockBalanceService.updateBalance).toHaveBeenCalledWith('bal1', 8);
      expect(mockAuditRepo.create).toHaveBeenCalled();
      expect(mockNotificationRepo.create).toHaveBeenCalled();
    });

    it('should throw 404 if leave request not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);
      await expect(leaveService.approveLeaveRequest('lr1', 'mgr1')).rejects.toThrow(AppError);
    });

    it('should throw 403 if unauthorized manager', async () => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockEmployeeService.isManagerOf.mockResolvedValue(false);
      await expect(leaveService.approveLeaveRequest('lr1', 'mgr2')).rejects.toThrow(AppError);
    });

    it('should throw 400 if invalid status transition', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: LeaveRequestStatus.DRAFT });
      mockEmployeeService.isManagerOf.mockResolvedValue(true);
      await expect(leaveService.approveLeaveRequest('lr1', 'mgr1')).rejects.toThrow(AppError);
    });

    it('should throw 404 if balance not found', async () => {
      const submittedReq = { ...mockLeaveRequest, status: LeaveRequestStatus.SUBMITTED };
      mockLeaveRepo.findById.mockResolvedValue(submittedReq);
      mockEmployeeService.isManagerOf.mockResolvedValue(true);
      mockBalanceService.getBalance.mockResolvedValue(null);
      await expect(leaveService.approveLeaveRequest('lr1', 'mgr1')).rejects.toThrow(AppError);
    });
  });

  describe('rejectLeaveRequest', () => {
    it('should reject, send notifications, write audit', async () => {
      const submittedReq = { ...mockLeaveRequest, status: LeaveRequestStatus.SUBMITTED };
      mockLeaveRepo.findById.mockResolvedValue(submittedReq);
      mockEmployeeService.isManagerOf.mockResolvedValue(true);
      const updatedReq = { ...submittedReq, status: LeaveRequestStatus.REJECTED };
      mockLeaveRepo.updateStatus.mockResolvedValue(updatedReq);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      const result = await leaveService.rejectLeaveRequest('lr1', 'mgr1', 'Not enough coverage');

      expect(result.status).toBe(LeaveRequestStatus.REJECTED);
      expect(mockAuditRepo.create).toHaveBeenCalled();
      expect(mockNotificationRepo.create).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);
      await expect(leaveService.rejectLeaveRequest('lr1', 'mgr1')).rejects.toThrow(AppError);
    });

    it('should throw 403 if unauthorized', async () => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      mockEmployeeService.isManagerOf.mockResolvedValue(false);
      await expect(leaveService.rejectLeaveRequest('lr1', 'mgr2')).rejects.toThrow(AppError);
    });

    it('should throw 400 if invalid status', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: LeaveRequestStatus.DRAFT });
      mockEmployeeService.isManagerOf.mockResolvedValue(true);
      await expect(leaveService.rejectLeaveRequest('lr1', 'mgr1')).rejects.toThrow(AppError);
    });
  });

  describe('cancelLeaveRequest', () => {
    it('should cancel, send notifications, write audit', async () => {
      const submittedReq = { ...mockLeaveRequest, status: LeaveRequestStatus.SUBMITTED };
      mockLeaveRepo.findById.mockResolvedValue(submittedReq);
      const updatedReq = { ...submittedReq, status: LeaveRequestStatus.CANCELLED };
      mockLeaveRepo.updateStatus.mockResolvedValue(updatedReq);
      mockAuditRepo.create.mockResolvedValue({});
      mockNotificationRepo.create.mockResolvedValue({});

      const result = await leaveService.cancelLeaveRequest('lr1', 'emp1');

      expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
      expect(mockAuditRepo.create).toHaveBeenCalled();
      expect(mockNotificationRepo.create).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);
      await expect(leaveService.cancelLeaveRequest('lr1', 'emp1')).rejects.toThrow(AppError);
    });

    it('should throw 403 if unauthorized', async () => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      await expect(leaveService.cancelLeaveRequest('lr1', 'emp2')).rejects.toThrow(AppError);
    });

    it('should throw 400 if invalid status', async () => {
      mockLeaveRepo.findById.mockResolvedValue({ ...mockLeaveRequest, status: LeaveRequestStatus.APPROVED });
      await expect(leaveService.cancelLeaveRequest('lr1', 'emp1')).rejects.toThrow(AppError);
    });
  });

  describe('getLeaveRequest', () => {
    it('should return a leave request by id', async () => {
      mockLeaveRepo.findById.mockResolvedValue(mockLeaveRequest);
      const result = await leaveService.getLeaveRequest('lr1');
      expect(result).toEqual(mockLeaveRequest);
    });

    it('should throw 404 if not found', async () => {
      mockLeaveRepo.findById.mockResolvedValue(null);
      await expect(leaveService.getLeaveRequest('lr1')).rejects.toThrow(AppError);
    });
  });

  describe('getEmployeeLeaveRequests', () => {
    it('should return employee leave requests with filters', async () => {
      mockEmployeeService.getEmployeeById.mockResolvedValue(mockEmployee);
      const req1 = { ...mockLeaveRequest, status: LeaveRequestStatus.SUBMITTED };
      const req2 = { ...mockLeaveRequest, id: 'lr2', status: LeaveRequestStatus.APPROVED };
      mockLeaveRepo.findByEmployeeId.mockResolvedValue([req1, req2]);

      const result = await leaveService.getEmployeeLeaveRequests('emp1', { status: LeaveRequestStatus.SUBMITTED });

      expect(result).toEqual([req1]);
    });

    it('should return all if no filters', async () => {
      mockEmployeeService.getEmployeeById.mockResolvedValue(mockEmployee);
      const req1 = mockLeaveRequest;
      const req2 = { ...mockLeaveRequest, id: 'lr2' };
      mockLeaveRepo.findByEmployeeId.mockResolvedValue([req1, req2]);

      const result = await leaveService.getEmployeeLeaveRequests('emp1');

      expect(result).toEqual([req1, req2]);
    });
  });
});
