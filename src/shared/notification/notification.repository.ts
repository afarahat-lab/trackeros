import { Notification, CreateNotificationDto } from '../../modules/notification/notification.model';

export interface INotificationRepository {
  create(dto: CreateNotificationDto): Promise<Notification>;
}
