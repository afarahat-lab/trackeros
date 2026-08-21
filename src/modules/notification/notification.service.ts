import { NotificationType, NotificationStatus } from '../../shared/types';
import type { LeaveRequest } from '../leave-request/leave-request.model';
import {
  Notification,
  INotificationRepository,
  INotificationService,
} from './notification.model';

export class NotificationService implements INotificationService {
  constructor(private readonly repository: INotificationRepository) {}

  async notifyLeaveSubmitted(leaveRequest: LeaveRequest): Promise<Notification> {
    return this.repository.create({
      recipientId: leaveRequest.employeeId,
      type: NotificationType.leave_submitted,
      title: 'Leave Request Submitted',
      message: `Your leave request (${leaveRequest.id}) has been submitted and is pending approval.`,
      relatedEntityType: 'leave_request',
      relatedEntityId: leaveRequest.id,
      status: NotificationStatus.pending,
      readAt: null,
    });
  }

  async notifyLeaveApproved(leaveRequest: LeaveRequest): Promise<Notification> {
    return this.repository.create({
      recipientId: leaveRequest.employeeId,
      type: NotificationType.leave_approved,
      title: 'Leave Request Approved',
      message: `Your leave request (${leaveRequest.id}) has been approved.`,
      relatedEntityType: 'leave_request',
      relatedEntityId: leaveRequest.id,
      status: NotificationStatus.pending,
      readAt: null,
    });
  }

  async notifyLeaveRejected(leaveRequest: LeaveRequest): Promise<Notification> {
    return this.repository.create({
      recipientId: leaveRequest.employeeId,
      type: NotificationType.leave_rejected,
      title: 'Leave Request Rejected',
      message: `Your leave request (${leaveRequest.id}) has been rejected.`,
      relatedEntityType: 'leave_request',
      relatedEntityId: leaveRequest.id,
      status: NotificationStatus.pending,
      readAt: null,
    });
  }

  async notifyLeaveCancelled(leaveRequest: LeaveRequest): Promise<Notification> {
    return this.repository.create({
      recipientId: leaveRequest.employeeId,
      type: NotificationType.leave_cancelled,
      title: 'Leave Request Cancelled',
      message: `Your leave request (${leaveRequest.id}) has been cancelled.`,
      relatedEntityType: 'leave_request',
      relatedEntityId: leaveRequest.id,
      status: NotificationStatus.pending,
      readAt: null,
    });
  }

  async getNotifications(recipientId: string): Promise<Notification[]> {
    return this.repository.findByRecipientId(recipientId);
  }

  async markAsRead(id: string): Promise<Notification> {
    const updated = await this.repository.updateStatus(
      id,
      NotificationStatus.read,
      new Date(),
    );
    if (updated === null) {
      throw new Error(`Notification not found: ${id}`);
    }
    return updated;
  }
}
