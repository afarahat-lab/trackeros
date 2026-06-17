import { ILeaveRepository } from './leave.repository';
import { ILeaveBalanceRepository } from '../balance/balance.repository';
import { ILeavePolicyRepository } from '../policy/policy.repository';
import { IEmployeeRepository } from '../employee/employee.repository';
import { IAuditLogRepository } from '../../shared/audit/audit.repository';
import { INotificationRepository } from '../../shared/notification/notification.repository';
import { LeaveRequest, CreateLeaveRequestDto, LeaveRequestQuery, LeaveStatus } from './leave.model';

export class LeaveService {
  constructor(
    private readonly leaveRepo: ILeaveRepository,
    private readonly balanceRepo: ILeaveBalanceRepository,
    private readonly policyRepo: ILeavePolicyRepository,
    private readonly employeeRepo: IEmployeeRepository,
    private readonly auditRepo: IAuditLogRepository,
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async findAll(query: LeaveRequestQuery): Promise<LeaveRequest[]> {
    return this.leaveRepo.findAll(query);
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    return this.leaveRepo.findById(id);
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // placeholder
    return this.leaveRepo.create(dto);
  }

  async approve(id: string, managerId: string): Promise<LeaveRequest | null> {
    // placeholder
    const leave = await this.leaveRepo.findById(id);
    if (!leave) return null;
    const updated = await this.leaveRepo.update(id, { managerId });
    return updated;
  }

  async reject(id: string, managerId: string): Promise<LeaveRequest | null> {
    // placeholder
    const leave = await this.leaveRepo.findById(id);
    if (!leave) return null;
    const updated = await this.leaveRepo.update(id, { managerId });
    return updated;
  }
}
