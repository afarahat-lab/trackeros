export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  type: 'EMAIL' | 'IN_APP';
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export class NotificationNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification with id "${id}" not found`);
    this.name = 'NotificationNotFoundError';
  }
}

export class InvalidNotificationTypeError extends Error {
  constructor(type: string) {
    super(`Invalid notification type "${type}". Must be 'EMAIL' or 'IN_APP'`);
    this.name = 'InvalidNotificationTypeError';
  }
}

export class EmptyNotificationContentError extends Error {
  constructor(field: string) {
    super(`Notification ${field} must not be empty`);
    this.name = 'EmptyNotificationContentError';
  }
}

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  create(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification>;
  findByRecipient(recipientId: string, limit?: number): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
}
