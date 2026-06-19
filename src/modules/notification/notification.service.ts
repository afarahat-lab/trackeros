import { Notification, CreateNotificationDto } from './notification.model';

export interface INotificationService {
  createNotification(dto: CreateNotificationDto): Promise<Notification>;
}
