import { RepositoryError } from '../employee/index';

export class NotificationNotFoundError extends RepositoryError {
  constructor(id: string) {
    super('NOTIFICATION_NOT_FOUND', `Notification with id '${id}' not found`);
    this.name = 'NotificationNotFoundError';
  }
}

export class InvalidNotificationError extends RepositoryError {
  constructor(message: string) {
    super('INVALID_NOTIFICATION', message);
    this.name = 'InvalidNotificationError';
  }
}
