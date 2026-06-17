export interface Notification {
  id: string;
  recipientId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface INotificationRepository {
  send(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification | null>;
}
