export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}

export interface INotificationRepository {
  findByRecipientId(recipientId: string): Promise<Notification[]>;
  create(data: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<Notification>;
  markAsRead(id: string): Promise<Notification | null>;
  updateStatus(id: string, status: NotificationStatus): Promise<Notification | null>;
}
