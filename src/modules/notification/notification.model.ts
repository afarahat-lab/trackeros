export enum NotificationType {
  LEAVE_REQUEST_SUBMITTED = 'leave_request_submitted',
  LEAVE_REQUEST_APPROVED = 'leave_request_approved',
  LEAVE_REQUEST_REJECTED = 'leave_request_rejected',
  LEAVE_REQUEST_CANCELLED = 'leave_request_cancelled'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  READ = 'read'
}

export interface Notification {
  id: string;
  recipientId: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  read: boolean;
  createdAt: Date;
}

export interface CreateNotificationDto {
  recipientId: string;
  message: string;
  type: NotificationType;
}
