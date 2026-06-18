import { Notification } from './notification.model';

export interface NotificationRepository {
  findByRecipient(recipientId: string): Promise<Notification[]>;
  save(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  markAsRead(id: string): Promise<Notification | null>;
}
