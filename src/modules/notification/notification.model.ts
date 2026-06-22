export interface Notification {
  id: string;
  recipientId: string;
  leaveRequestId: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface CreateNotificationDto {
  recipientId: string;
  leaveRequestId: string;
  type: string;
  message: string;
}
