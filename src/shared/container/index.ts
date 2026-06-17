import { ILeaveService, LeaveService } from '../../modules/leave/leave.service';
import { ILeaveBalanceService, LeaveBalanceService } from '../../modules/balance/balance.service';
import { ILeavePolicyService, LeavePolicyService } from '../../modules/policy/policy.service';
import { ILeaveRepository } from '../../modules/leave/leave.repository';
import { ILeaveBalanceRepository } from '../../modules/balance/balance.repository';
import { ILeavePolicyRepository } from '../../modules/policy/policy.repository';
import { IEmployeeRepository } from '../../modules/employee/employee.repository';
import { IAuditLogRepository } from '../audit/audit.repository';
import { INotificationRepository } from '../notification/notification.repository';

export interface Container {
  leaveService: ILeaveService;
  leaveBalanceService: ILeaveBalanceService;
  leavePolicyService: ILeavePolicyService;
  leaveRepository: ILeaveRepository;
  leaveBalanceRepository: ILeaveBalanceRepository;
  leavePolicyRepository: ILeavePolicyRepository;
  employeeRepository: IEmployeeRepository;
  auditLogRepository: IAuditLogRepository;
  notificationRepository: INotificationRepository;
}

export function createContainer(
  leaveRepository: ILeaveRepository,
  leaveBalanceRepository: ILeaveBalanceRepository,
  leavePolicyRepository: ILeavePolicyRepository,
  employeeRepository: IEmployeeRepository,
  auditLogRepository: IAuditLogRepository,
  notificationRepository: INotificationRepository,
): Container {
  const leaveService = new LeaveService(
    leaveRepository,
    leaveBalanceRepository,
    leavePolicyRepository,
    employeeRepository,
    auditLogRepository,
    notificationRepository,
  );

  const leaveBalanceService = new LeaveBalanceService(
    leaveBalanceRepository,
    auditLogRepository,
  );

  const leavePolicyService = new LeavePolicyService(
    leavePolicyRepository,
  );

  return {
    leaveService,
    leaveBalanceService,
    leavePolicyService,
    leaveRepository,
    leaveBalanceRepository,
    leavePolicyRepository,
    employeeRepository,
    auditLogRepository,
    notificationRepository,
  };
}
