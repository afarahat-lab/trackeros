import { NotificationType, NotificationStatus } from '../../shared/types/leave.types';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: 'LeaveRequest' | 'LeaveBalance' | null;
  relatedEntityId: string | null;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}
