import { LeaveManagementService, ForbiddenError } from '../leave-management.service';
import { ILeaveRequestRepository } from '../../leave/leave.repository';
import { ILeavePolicyRepository } from '../../policy/policy.repository';
import { ILeaveBalanceRepository } from '../../balance/balance.repository';
import { IAuditService } from '../../../shared/audit/audit.service.interface';
import { IEmployeeRepository } from '../../employee/employee.repository';
import { INotificationRepository } from '../../notification/notification.repository';
import { Pool } from 'pg';
import { UserContext } from '../leave-management.service.interface';

describe('LeaveManagementService', () => {
  let service: LeaveManagementService;
  let leaveRepo: jest.Mocked<ILeaveRequestRepository>;
  let policyRepo: jest.Mocked<ILeavePolicyRepository>;
  let balanceRepo: jest.Mocked<ILeaveBalanceRepository>;
  let auditService: jest.Mocked<IAuditService>;
  let employeeRepo: jest.Mocked<IEmployeeRepository>;
  let notificationRepo: jest.Mocked<INotificationRepository>;
  let dbPool: jest.Mocked<Pool>;
  let mockClient: any;

  const managerUser: UserContext = { id: 'manager-uuid', role: 'manager' };
  const employeeUser: UserContext = { id: 'employee-uuid', role: 'employee' };
  const otherEmployeeUser: UserContext = { id: 'other-uuid', role: 'employee' };

  beforeEach(() => {
    leaveRepo = { create: jest.fn(), findById: jest.fn(), findByEmployeeId: jest.fn(), findByApproverId: jest.fn(), update: jest.fn(), updateStatus: jest.fn() } as any;
    policyRepo = { findByLeaveTypeId: jest.fn() } as any;
    balanceRepo = { findByEmployeeIdAndLeaveTypeIdAndYear: jest.fn(), update: jest.fn(), findByEmployeeId: jest.fn() } as any;
    auditService = { log: jest.fn() } as any;
    employeeRepo = { findById: jest.fn() } as any;
    notificationRepo = { create: jest.fn() } as any;
    
    mockClient = { query: jest.fn(), release: jest.fn() };
    dbPool = { connect: jest.fn().mockResolvedValue(mockClient) } as any;

    service = new LeaveManagementService(
      leaveRepo, policyRepo, balanceRepo, auditService, employeeRepo, notificationRepo, dbPool
    );
  });

  describe('RBAC Enforcement', () => {
    it('should throw ForbiddenError if non-manager calls approveLeaveRequest', async () => {
      await expect(service.approveLeaveRequest('leave-uuid', 'ok', employeeUser))
        .rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if manager is not managing the employee', async () => {
      leaveRepo.findById.mockResolvedValue({ employeeId: 'other-uuid', status: 'submitted', startDate: new Date(), endDate: new Date() } as any);
      employeeRepo.findById.mockResolvedValue({ id: 'other-uuid', managerId: 'some-other-manager' } as any);

      await expect(service.approveLeaveRequest('leave-uuid', 'ok', managerUser))
        .rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if employee calls cancelLeaveRequest on another\'s request', async () => {
      leaveRepo.findById.mockResolvedValue({ employeeId: 'other-uuid', status: 'submitted' } as any);

      await expect(service.cancelLeaveRequest('leave-uuid', employeeUser))
        .rejects.toThrow(ForbiddenError);
    });
  });

  describe('Read Operations Scoping', () => {
    it('getLeaveBalance returns correct data scoped to employee', async () => {
      balanceRepo.findByEmployeeId.mockResolvedValue([]);
      await service.getLeaveBalance('employee-uuid', employeeUser);
      expect(balanceRepo.findByEmployeeId).toHaveBeenCalledWith('employee-uuid');
      
      await expect(service.getLeaveBalance('other-uuid', employeeUser))
        .rejects.toThrow(ForbiddenError);
    });

    it('getLeaveHistory returns correct data scoped to manager', async () => {
      employeeRepo.findById.mockResolvedValue({ id: 'employee-uuid', managerId: 'manager-uuid' } as any);
      leaveRepo.findByEmployeeId.mockResolvedValue([]);
      
      await service.getLeaveHistory({ employeeId: 'employee-uuid' }, managerUser);
      expect(leaveRepo.findByEmployeeId).toHaveBeenCalledWith('employee-uuid');
    });
  });

  describe('Audit Logging & Transactions', () => {
    it('should call auditService.log and execute transaction on submitLeaveRequest', async () => {
      const dto = { employeeId: 'employee-uuid', leaveTypeId: 'type-uuid', startDate: new Date(), endDate: new Date() };
      policyRepo.findByLeaveTypeId.mockResolvedValue({} as any);
      balanceRepo.findByEmployeeIdAndLeaveTypeIdAndYear.mockResolvedValue({ totalEntitlement: 10, usedDays: 0, pendingDays: 0 } as any);
      leaveRepo.create.mockResolvedValue({ id: 'new-leave-uuid' } as any);
      leaveRepo.updateStatus.mockResolvedValue({ id: 'new-leave-uuid', status: 'submitted' } as any);

      await service.submitLeaveRequest(dto, employeeUser);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'leave_request',
        entityId: 'new-leave-uuid',
        action: 'SUBMITTED',
        changedBy: 'employee-uuid'
      }));
    });
  });
});
