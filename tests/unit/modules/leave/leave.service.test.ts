import { LeaveService } from '../../../../src/modules/leave/leave.service';
import { LeaveRequestStatus, AuditAction, EmploymentStatus } from '../../../../src/shared/types/index';

describe('LeaveService', () => {
  let leaveService: LeaveService;
  let mockLeaveRepository: any;
  let mockEmployeeService: any;
  let mockPolicyService: any;
  let mockBalanceService: any;
  let mockAuditService: any;
  let mockNotificationService: any;

  const mockEmployee = {
    id: 'emp1',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'mgr1',
    department: 'IT',
    hireDate: new Date(),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  };

  const mockLeaveRequest = {
    id: 'req1',
    employeeId: 'emp1',
    leaveTypeId: 'annual',
    startDate: new Date('2023-10-01'),
    endDate: new Date('2023-10-05'),
    reason: 'Vacation',
    status: LeaveRequestStatus.SUBMITTED,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockLeaveRepository = {
      create: jest.fn().mockResolvedValue(mockLeaveRequest),
      findById: jest.fn().mockResolvedValue(mockLeaveRequest),
      update: jest.fn().mockResolvedValue({ ...mockLeaveRequest, status: LeaveRequestStatus.APPROVED })
    };

    mockEmployeeService = {
      getEmployee: jest.fn().mockResolvedValue(mockEmployee)
    };

    mockPolicyService = {
      validateEntitlement: jest.fn().mockResolvedValue(true)
    };

    mockBalanceService = {
      getBalance: jest.fn().mockResolvedValue({ remainingDays: 10 }),
      deductBalance: jest.fn().mockResolvedValue({}),
      restoreBalance: jest.fn().mockResolvedValue({})
    };

    mockAuditService = {
      recordAction: jest.fn().mockResolvedValue({})
    };

    mockNotificationService = {
      createNotification: jest.fn().mockResolvedValue({})
    };

    leaveService = new LeaveService(
      mockLeaveRepository,
      mockEmployeeService,
      mockPolicyService,
      mockBalanceService,
      mockAuditService,
      mockNotificationService
    );
  });

  describe('submitLeaveRequest', () => {
    it('should submit a leave request successfully', async () => {
      const dto = {
        employeeId: 'emp1',
        leaveTypeId: 'annual',
        startDate: new Date('2023-10-01'),
        endDate: new Date('2023-10-05'),
        reason: 'Vacation'
      };

      const result = await leaveService.submitLeaveRequest(dto, 'emp1');

      expect(mockEmployeeService.getEmployee).toHaveBeenCalledWith('emp1');
      expect(mockBalanceService.getBalance).toHaveBeenCalledWith('emp1', 'annual', expect.any(Number));
      expect(mockPolicyService.validateEntitlement).toHaveBeenCalledWith('annual', 5, 10);
      expect(mockLeaveRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 'emp1',
        leaveTypeId: 'annual',
        status: LeaveRequestStatus.SUBMITTED
      }));
      expect(mockAuditService.recordAction).toHaveBeenCalledWith(
        'LeaveRequest',
        mockLeaveRequest.id,
        AuditAction.SUBMIT,
        'emp1',
        { newValues: mockLeaveRequest }
      );
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: 'mgr1',
        relatedEntityType: 'LeaveRequest',
        relatedEntityId: mockLeaveRequest.id
      }));
      expect(result).toEqual(mockLeaveRequest);
    });
  });

  describe('approveLeaveRequest', () => {
    it('should approve a leave request and deduct balance', async () => {
      const result = await leaveService.approveLeaveRequest('req1', 'mgr1');

      expect(mockLeaveRepository.findById).toHaveBeenCalledWith('req1');
      expect(mockBalanceService.deductBalance).toHaveBeenCalledWith('emp1', 'annual', 5);
      expect(mockLeaveRepository.update).toHaveBeenCalledWith('req1', expect.objectContaining({
        status: LeaveRequestStatus.APPROVED,
        approvedBy: 'mgr1'
      }));
      expect(mockAuditService.recordAction).toHaveBeenCalledWith(
        'LeaveRequest',
        'req1',
        AuditAction.APPROVE,
        'mgr1',
        expect.any(Object)
      );
      expect(result.status).toEqual(LeaveRequestStatus.APPROVED);
    });
  });

  describe('rejectLeaveRequest', () => {
    it('should reject a leave request', async () => {
      mockLeaveRepository.update.mockResolvedValue({ ...mockLeaveRequest, status: LeaveRequestStatus.REJECTED });
      
      const result = await leaveService.rejectLeaveRequest('req1', 'mgr1');

      expect(mockLeaveRepository.update).toHaveBeenCalledWith('req1', expect.objectContaining({
        status: LeaveRequestStatus.REJECTED
      }));
      expect(mockAuditService.recordAction).toHaveBeenCalledWith(
        'LeaveRequest',
        'req1',
        AuditAction.REJECT,
        'mgr1',
        expect.any(Object)
      );
    });
  });

  describe('cancelLeaveRequest', () => {
    it('should cancel an approved leave request and restore balance', async () => {
      const approvedRequest = { ...mockLeaveRequest, status: LeaveRequestStatus.APPROVED };
      mockLeaveRepository.findById.mockResolvedValue(approvedRequest);
      mockLeaveRepository.update.mockResolvedValue({ ...approvedRequest, status: LeaveRequestStatus.CANCELLED });

      const result = await leaveService.cancelLeaveRequest('req1', 'emp1');

      expect(mockBalanceService.restoreBalance).toHaveBeenCalledWith('emp1', 'annual', 5);
      expect(mockLeaveRepository.update).toHaveBeenCalledWith('req1', expect.objectContaining({
        status: LeaveRequestStatus.CANCELLED
      }));
      expect(mockAuditService.recordAction).toHaveBeenCalledWith(
        'LeaveRequest',
        'req1',
        AuditAction.CANCEL,
        'emp1',
        expect.any(Object)
      );
    });
  });
});
