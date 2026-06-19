export interface CreateNotificationDto {
  recipientId: string;
  senderId?: string;
  type: 'leave_submitted' | 'leave_approved' | 'leave_rejected' | 'balance_low' | 'system_alert';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface MarkAsReadDto {
  notificationId: string;
  recipientId: string;
}

export interface NotificationQueryDto {
  recipientId: string;
  isRead?: boolean;
  type?: string;
}
