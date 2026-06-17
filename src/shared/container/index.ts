import { ILeaveService, LeaveService } from '../../modules/leave/leave.service';
import { ILeaveBalanceService, LeaveBalanceService } from '../../modules/balance/balance.service';
import { ILeavePolicyService, LeavePolicyService } from '../../modules/policy/policy.service';
import { ILeaveRepository } from '../../modules/leave/leave.repository';
import { ILeaveBalanceRepository } from '../../modules/balance/balance.repository';
import { ILeavePolicyRepository } from '../../modules/policy/policy.repository';
import { IEmployeeRepository } from '../../modules/employee/employee.repository';
import { IAuditLogRepository } from '../audit/audit.repository';
import { INotificationRepository } from '../notification/notification.repository';
import { LeaveRepository } from '../../modules/leave/leave.repository.impl';
import { LeaveBalanceRepository } from '../../modules/balance/balance.repository.impl';
import { LeavePolicyRepository } from '../../modules/policy/policy.repository.impl';
import { EmployeeRepository } from '../../modules/employee/employee.repository.impl';
import { AuditLogRepository } from '../audit/audit.repository.impl';
import { NotificationRepository } from '../notification/notification.repository.impl';

export class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.registerServices();
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private registerServices(): void {
    // Register repositories
    this.services.set('ILeaveRepository', new LeaveRepository());
    this.services.set('ILeaveBalanceRepository', new LeaveBalanceRepository());
    this.services.set('ILeavePolicyRepository', new LeavePolicyRepository());
    this.services.set('IEmployeeRepository', new EmployeeRepository());
    this.services.set('IAuditLogRepository', new AuditLogRepository());
    this.services.set('INotificationRepository', new NotificationRepository());

    // Register services with dependencies
    this.services.set('ILeaveService', new LeaveService(
      this.services.get('ILeaveRepository'),
      this.services.get('ILeaveBalanceRepository'),
      this.services.get('ILeavePolicyRepository'),
      this.services.get('IEmployeeRepository'),
      this.services.get('IAuditLogRepository'),
      this.services.get('INotificationRepository')
    ));

    this.services.set('ILeaveBalanceService', new LeaveBalanceService(
      this.services.get('ILeaveBalanceRepository'),
      this.services.get('IEmployeeRepository'),
      this.services.get('ILeavePolicyRepository')
    ));

    this.services.set('ILeavePolicyService', new LeavePolicyService(
      this.services.get('ILeavePolicyRepository')
    ));
  }

  public get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }
}
