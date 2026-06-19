import { Notification, CreateNotificationDto } from './notification.model';

export interface INotificationRepository {
  create(data: CreateNotificationDto): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByRecipientId(recipientId: string): Promise<Notification[]>;
  updateStatus(id: string, status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED'): Promise<Notification | null>;
  markAsRead(id: string): Promise<Notification | null>;
  delete(id: string): Promise<boolean>;
}
