import { Notification } from './notification.model';

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByRecipientId(recipientId: string): Promise<Notification[]>;
  findUnreadByRecipientId(recipientId: string): Promise<Notification[]>;
  save(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification>;
  markAsRead(id: string): Promise<Notification | null>;
}
