import type { LeaveRequest } from '../leave-request/leave-request.model';
import { NotificationType, NotificationStatus } from '../../shared/types';

// ---- Entity ----

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}

// ---- Repository interface ----

export interface INotificationRepository {
  findByRecipientId(recipientId: string): Promise<Notification[]>;
  findByRecipientIdAndStatus(
    recipientId: string,
    status: NotificationStatus,
  ): Promise<Notification[]>;
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  updateStatus(
    id: string,
    status: NotificationStatus,
    readAt?: Date,
  ): Promise<Notification | null>;
}

// ---- Service interface ----

export interface INotificationService {
  /**
   * Create a notification for a submitted leave request.
   * Sets relatedEntityType to 'leave_request', relatedEntityId to leaveRequest.id,
   * type to NotificationType.leave_submitted, and recipientId to leaveRequest.employeeId.
   */
  notifyLeaveSubmitted(leaveRequest: LeaveRequest): Promise<Notification>;

  /**
   * Create a notification for an approved leave request.
   * Sets relatedEntityType to 'leave_request', relatedEntityId to leaveRequest.id,
   * type to NotificationType.leave_approved, and recipientId to leaveRequest.employeeId.
   */
  notifyLeaveApproved(leaveRequest: LeaveRequest): Promise<Notification>;

  /**
   * Create a notification for a rejected leave request.
   * Sets relatedEntityType to 'leave_request', relatedEntityId to leaveRequest.id,
   * type to NotificationType.leave_rejected, and recipientId to leaveRequest.employeeId.
   */
  notifyLeaveRejected(leaveRequest: LeaveRequest): Promise<Notification>;

  /**
   * Create a notification for a cancelled leave request.
   * Sets relatedEntityType to 'leave_request', relatedEntityId to leaveRequest.id,
   * type to NotificationType.leave_cancelled, and recipientId to leaveRequest.employeeId.
   */
  notifyLeaveCancelled(leaveRequest: LeaveRequest): Promise<Notification>;

  getNotifications(recipientId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification>;
}
