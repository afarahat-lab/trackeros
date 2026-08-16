import { LeaveRequest } from '../leave-request/leave-request.model';
import { LeaveNotification } from './notification.model';
import { INotificationRepository } from './notification.repository';
import { IEmployeeRepository } from '../employee';
import { INotificationService } from './notification.service.interface';
import { NotificationStatus } from '../../shared/types';

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly employeeRepo: IEmployeeRepository,
  ) {}

  async notifyLeaveSubmitted(leaveRequest: LeaveRequest): Promise<LeaveNotification> {
    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee) {
      throw { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' };
    }

    if (!employee.managerId) {
      throw { error: 'Employee has no manager assigned', code: 'NO_MANAGER_ASSIGNED' };
    }

    return this.notificationRepo.create({
      recipientId: employee.managerId,
      type: 'SUBMITTED',
      title: 'New Leave Request Submitted',
      message: `${employee.firstName} ${employee.lastName} has submitted a leave request for ${leaveRequest.startDate.toISOString().split('T')[0]} to ${leaveRequest.endDate.toISOString().split('T')[0]}.`,
      leaveRequestId: leaveRequest.id,
      status: NotificationStatus.PENDING,
      readAt: null,
    });
  }

  async notifyLeaveApproved(leaveRequest: LeaveRequest): Promise<LeaveNotification> {
    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee) {
      throw { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' };
    }

    return this.notificationRepo.create({
      recipientId: leaveRequest.employeeId,
      type: 'APPROVED',
      title: 'Leave Request Approved',
      message: `Your leave request for ${leaveRequest.startDate.toISOString().split('T')[0]} to ${leaveRequest.endDate.toISOString().split('T')[0]} has been approved.`,
      leaveRequestId: leaveRequest.id,
      status: NotificationStatus.PENDING,
      readAt: null,
    });
  }

  async notifyLeaveRejected(leaveRequest: LeaveRequest): Promise<LeaveNotification> {
    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee) {
      throw { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' };
    }

    return this.notificationRepo.create({
      recipientId: leaveRequest.employeeId,
      type: 'REJECTED',
      title: 'Leave Request Rejected',
      message: `Your leave request for ${leaveRequest.startDate.toISOString().split('T')[0]} to ${leaveRequest.endDate.toISOString().split('T')[0]} has been rejected.`,
      leaveRequestId: leaveRequest.id,
      status: NotificationStatus.PENDING,
      readAt: null,
    });
  }

  async notifyLeaveCancelled(leaveRequest: LeaveRequest): Promise<LeaveNotification> {
    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    if (!employee) {
      throw { error: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' };
    }

    if (!employee.managerId) {
      throw { error: 'Employee has no manager assigned', code: 'NO_MANAGER_ASSIGNED' };
    }

    return this.notificationRepo.create({
      recipientId: employee.managerId,
      type: 'CANCELLED',
      title: 'Leave Request Cancelled',
      message: `${employee.firstName} ${employee.lastName} has cancelled their leave request for ${leaveRequest.startDate.toISOString().split('T')[0]} to ${leaveRequest.endDate.toISOString().split('T')[0]}.`,
      leaveRequestId: leaveRequest.id,
      status: NotificationStatus.PENDING,
      readAt: null,
    });
  }

  async getNotificationsForUser(recipientId: string): Promise<LeaveNotification[]> {
    return this.notificationRepo.findByRecipientId(recipientId);
  }

  async markAsRead(id: string): Promise<void> {
    const notification = await this.notificationRepo.findById(id);
    if (!notification) {
      throw { error: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' };
    }

    if (notification.status === NotificationStatus.READ || notification.status === NotificationStatus.ARCHIVED) {
      return;
    }

    await this.notificationRepo.updateStatus(id, NotificationStatus.READ);
  }
}
