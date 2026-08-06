export type NotificationType = 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED';

export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';

export type NotificationRelatedEntityType = 'LeaveRequest';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: NotificationRelatedEntityType;
  relatedEntityId: string;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}
