export enum NotificationChannel {
  Email = 'email',
  InApp = 'in-app',
  SMS = 'sms',
}

export enum NotificationStatus {
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
}

export interface Notification {
  id: string;
  recipientId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  status: NotificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationDto {
  recipientId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
}
