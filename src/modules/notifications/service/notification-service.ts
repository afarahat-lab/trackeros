import { NotificationRepository } from '../repository/notification-repository';
import { Notification } from '../domain/notification';

/**
 * Service for handling notification business logic.
 */
export class NotificationService {
  constructor(private repository: NotificationRepository) {}

  /**
   * Create a new notification.
   * @param notification - Notification data to create.
   * @returns The created notification.
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    return this.repository.create(notification);
  }

  /**
   * Retrieve all notifications.
   * @returns A list of notifications.
   */
  async getAllNotifications(): Promise<Notification[]> {
    return this.repository.findAll();
  }
}
