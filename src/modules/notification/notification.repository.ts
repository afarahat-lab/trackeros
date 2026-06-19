import { Notification, CreateNotificationDto, NotificationStatus } from './notification.model';

export interface INotificationRepository {
  create(data: CreateNotificationDto & { status: NotificationStatus }): Promise<Notification>;
  updateStatus(notificationId: string, status: NotificationStatus): Promise<Notification>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
}
