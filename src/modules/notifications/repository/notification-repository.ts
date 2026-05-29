import { Notification } from '../domain/notification';

/**
 * Interface for Notification repository.
 */
export interface NotificationRepository {
  create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  findAll(): Promise<Notification[]>;
}

/**
 * Implementation of NotificationRepository using a database.
 */
export class NotificationRepositoryImpl implements NotificationRepository {
  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    // Implement database insertion logic here
    // Return the created notification with id and createdAt populated
    throw new Error('Not implemented');
  }

  async findAll(): Promise<Notification[]> {
    // Implement database retrieval logic here
    throw new Error('Not implemented');
  }
}
