import { NotificationRepository } from './notification.repository';
import { CreateNotificationDto } from './notification.dto';
import { Notification } from './notification.model';

export interface NotificationService {
  createNotification(dto: CreateNotificationDto): Promise<Notification>;
  markAsRead(notificationId: string, recipientId: string): Promise<Notification>;
  getUnreadNotifications(recipientId: string): Promise<Notification[]>;
}

export class NotificationServiceImpl implements NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async markAsRead(notificationId: string, recipientId: string): Promise<Notification> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }

  async getUnreadNotifications(recipientId: string): Promise<Notification[]> {
    // Implementation will be added in Phase 3
    throw new Error('Not implemented');
  }
}
