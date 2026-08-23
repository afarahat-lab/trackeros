export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  type: 'EMAIL' | 'IN_APP';
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface INotificationRepository {
  create(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification>;
  findByRecipient(recipientId: string, limit?: number): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
}
