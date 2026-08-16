import { LeaveRequest } from '../leave-request/leave-request.model';
import { LeaveNotification } from './notification.model';

export interface INotificationService {
  notifyLeaveSubmitted(leaveRequest: LeaveRequest): Promise<LeaveNotification>;
  notifyLeaveApproved(leaveRequest: LeaveRequest): Promise<LeaveNotification>;
  notifyLeaveRejected(leaveRequest: LeaveRequest): Promise<LeaveNotification>;
  notifyLeaveCancelled(leaveRequest: LeaveRequest): Promise<LeaveNotification>;
  getNotificationsForUser(recipientId: string): Promise<LeaveNotification[]>;
  markAsRead(id: string): Promise<void>;
}
