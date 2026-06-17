import { INotificationRepository } from './notification.repository';
import { Notification, CreateNotificationDto } from '../../modules/notification/notification.model';

export class NotificationRepository implements INotificationRepository {
  async create(dto: CreateNotificationDto): Promise<Notification> {
    throw new Error('Not implemented');
  }
}
