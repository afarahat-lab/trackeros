import { ILeaveService } from './leave.service.interface';
import { ILeaveRequestRepository } from './leave.repository.interface';
import { IBalanceService } from '../balance/balance.service.interface';
import { IEmployeeService } from '../employee/employee.service.interface';
import { IPolicyService } from '../policy/policy.service.interface';
import { INotificationService } from '../notification/notification.service.interface';
import { IAuditService } from '../audit/audit.service.interface';
import { LeaveRequest, LeaveStatus, AppError } from '../../shared/types/index';

export class LeaveService implements ILeaveService {
  constructor(
    private readonly leaveRequestRepo: ILeaveRequestRepository,
    private readonly balanceService: IBalanceService,
    private readonly employeeService: IEmployeeService,
    private readonly policyService: IPolicyService,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService
  ) {}

  async createLeaveRequest(employeeId: string, leaveTypeId: string, startDate: Date, endDate: Date, reason?: string): Promise<LeaveRequest> {
    const employee = await this.employeeService.getEmployee(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    const policy = await this.policyService.getPolicy(leaveTypeId);
    if (!policy) throw new AppError('Leave policy not found', 404);

    if (startDate > endDate) throw new AppError('Start date must be before end date', 400);

    const request = await this.leaveRequestRepo.create({ employeeId, leaveTypeId, startDate, endDate, reason });
    
    try {
      await (this.auditService as any).logAction('LeaveRequest', request.id, 'created', employeeId);
    } catch (error) {
      console.error('Audit logging failed for createLeaveRequest', error);
    }
    
    return request;
  }

  async submitLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepo.findById(requestId);
    if (!request) throw new AppError('Leave request not found', 404);
    if (request.employeeId !== employeeId) throw new AppError('Unauthorized', 403);

    const updated = await this.leaveRequestRepo.updateStatus(requestId, LeaveStatus.Pending);
    
    try {
      await this.notificationService.createNotification(employeeId, 'Leave request submitted', requestId);
      await (this.auditService as any).logAction('LeaveRequest', requestId, 'submitted', employeeId);
    } catch (error) {
      console.error('Notification/Audit failed for submitLeaveRequest', error);
    }
    
    return updated;
  }

  async approveLeaveRequest(requestId: string, approverId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepo.findById(requestId);
    if (!request) throw new AppError('Leave request not found', 404);
    
    const approver = await this.employeeService.getEmployee(approverId);
    if (!approver || approver.role !== 'manager') throw new AppError('Unauthorized', 403);

    const days = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const balance = await this.balanceService.getBalance(request.employeeId, request.leaveTypeId, request.startDate.getFullYear());
    
    if (!balance || (balance.daysAllocated - balance.daysUsed) < days) {
      throw new AppError('Insufficient leave balance', 400);
    }
    
    await this.balanceService.updateBalance(request.employeeId, request.leaveTypeId, request.startDate.getFullYear(), balance.daysUsed + days);
    const updated = await this.leaveRequestRepo.updateStatus(requestId, LeaveStatus.Approved, approverId, new Date());
    
    try {
      await this.notificationService.createNotification(request.employeeId, 'Leave request approved', requestId);
      await (this.auditService as any).logAction('LeaveRequest', requestId, 'approved', approverId);
    } catch (error) {
      console.error('Notification/Audit failed for approveLeaveRequest', error);
    }
    
    return updated;
  }

  async rejectLeaveRequest(requestId: string, approverId: string, reason?: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepo.findById(requestId);
    if (!request) throw new AppError('Leave request not found', 404);

    const updated = await this.leaveRequestRepo.updateStatus(requestId, LeaveStatus.Rejected, approverId, new Date());
    
    try {
      await this.notificationService.createNotification(request.employeeId, `Leave request rejected: ${reason || ''}`, requestId);
      await (this.auditService as any).logAction('LeaveRequest', requestId, 'rejected', approverId);
    } catch (error) {
      console.error('Notification/Audit failed for rejectLeaveRequest', error);
    }
    
    return updated;
  }

  async cancelLeaveRequest(requestId: string, employeeId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepo.findById(requestId);
    if (!request) throw new AppError('Leave request not found', 404);
    if (request.employeeId !== employeeId) throw new AppError('Unauthorized', 403);
    if (request.status === LeaveStatus.Rejected) throw new AppError('Cannot cancel a rejected request', 400);

    if (request.status === LeaveStatus.Approved) {
      const days = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const balance = await this.balanceService.getBalance(request.employeeId, request.leaveTypeId, request.startDate.getFullYear());
      if (balance) {
        await this.balanceService.updateBalance(request.employeeId, request.leaveTypeId, request.startDate.getFullYear(), Math.max(0, balance.daysUsed - days));
      }
    }

    // Using Rejected status to represent cancellation as the LeaveStatus enum lacks a specific 'Cancelled' state
    const updated = await this.leaveRequestRepo.updateStatus(requestId, LeaveStatus.Rejected, null, new Date());
    
    try {
      await this.notificationService.createNotification(employeeId, 'Leave request cancelled', requestId);
      await (this.auditService as any).logAction('LeaveRequest', requestId, 'cancelled', employeeId);
    } catch (error) {
      console.error('Notification/Audit failed for cancelLeaveRequest', error);
    }
    
    return updated;
  }

  async getLeaveRequest(requestId: string): Promise<LeaveRequest | null> {
    return await this.leaveRequestRepo.findById(requestId);
  }

  async getLeaveRequestsByEmployee(employeeId: string, status?: string): Promise<LeaveRequest[]> {
    const requests = await this.leaveRequestRepo.findByEmployeeId(employeeId);
    if (status) {
      return requests.filter(r => r.status === status);
    }
    return requests;
  }

  async getPendingRequestsForManager(managerId: string): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepo.findByManagerId(managerId);
  }
}
