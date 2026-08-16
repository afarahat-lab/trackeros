import { LeaveNotification } from './notification.model';
import { INotificationRepository } from './notification.repository';
import { IEmployeeRepository } from '../employee';
import { INotificationService } from './notification.service.interface';
import { LeaveRequest } from '../leave-request';
import { NotificationStatus } from '../../shared/types';

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly employeeRepo: IEmployeeRepository,
  ) {}

  async notifyLeaveSubmitted(leaveRequest: LeaveRequest): Promise<LeaveNotification> {
    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    const recipientId = employee?.managerId ?? leaveRequest.employeeId;

    return this.notificationRepo.create({
      recipientId,
      type: 'SUBMITTED',
      title: 'Leave Request Submitted',
      message: `A leave request from ${employee?.firstName ?? 'Employee'} ${employee?.lastName ?? ''} has been submitted for approval.`,
      leaveRequestId: leaveRequest.id,
      status: NotificationStatus.PENDING,
      readAt: null,
    });
  }

  async notifyLeaveApproved(leaveRequest: LeaveRequest): Promise<LeaveNotification> {
    return this.notificationRepo.create({
      recipientId: leaveRequest.employeeId,
      type: 'APPROVED',
      title: 'Leave Request Approved',
      message: 'Your leave request has been approved.',
      leaveRequestId: leaveRequest.id,
      status: NotificationStatus.PENDING,
      readAt: null,
    });
  }

  async notifyLeaveRejected(leaveRequest: LeaveRequest): Promise<LeaveNotification> {
    return this.notificationRepo.create({
      recipientId: leaveRequest.employeeId,
      type: 'REJECTED',
      title: 'Leave Request Rejected',
      message: 'Your leave request has been rejected.',
      leaveRequestId: leaveRequest.id,
      status: NotificationStatus.PENDING,
      readAt: null,
    });
  }

  async notifyLeaveCancelled(leaveRequest: LeaveRequest): Promise<LeaveNotification> {
    const employee = await this.employeeRepo.findById(leaveRequest.employeeId);
    const recipientId = employee?.managerId ?? leaveRequest.employeeId;

    return this.notificationRepo.create({
      recipientId,
      type: 'CANCELLED',
      title: 'Leave Request Cancelled',
      message: `A leave request from ${employee?.firstName ?? 'Employee'} ${employee?.lastName ?? ''} has been cancelled.`,
      leaveRequestId: leaveRequest.id,
      status: NotificationStatus.PENDING,
      readAt: null,
    });
  }

  async getNotificationsForUser(recipientId: string): Promise<LeaveNotification[]> {
    return this.notificationRepo.findByRecipientId(recipientId);
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationRepo.updateStatus(id, NotificationStatus.READ);
  }
}
