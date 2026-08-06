import { Notification, NotificationStatus } from './notification.model';

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByRecipient(recipientId: string, status?: NotificationStatus): Promise<Notification[]>;
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  updateStatus(id: string, status: NotificationStatus): Promise<Notification | null>;
  markAsRead(id: string): Promise<Notification | null>;
  findByRelatedEntity(entityType: string, entityId: string): Promise<Notification[]>;
}
