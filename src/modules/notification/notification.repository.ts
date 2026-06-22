import { Notification, CreateNotificationDto } from './notification.model';

export interface INotificationRepository {
  create(dto: CreateNotificationDto): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
}
