import {
  Notification,
  INotificationRepository,
  NotificationNotFoundError,
  InvalidNotificationTypeError,
  EmptyNotificationContentError,
} from './notification.model';

const VALID_TYPES = new Set(['EMAIL', 'IN_APP']);

export class NotificationService {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  async send(
    recipientId: string,
    title: string,
    body: string,
    type: 'EMAIL' | 'IN_APP',
    metadata?: Record<string, unknown>
  ): Promise<Notification> {
    if (title.trim().length === 0) {
      throw new EmptyNotificationContentError('title');
    }
    if (body.trim().length === 0) {
      throw new EmptyNotificationContentError('body');
    }
    if (!VALID_TYPES.has(type)) {
      throw new InvalidNotificationTypeError(type);
    }

    return this.notificationRepo.create({
      recipientId,
      title: title.trim(),
      body: body.trim(),
      type,
      metadata: metadata ?? null,
    });
  }

  async getForUser(
    recipientId: string,
    limit?: number
  ): Promise<Notification[]> {
    return this.notificationRepo.findByRecipient(recipientId, limit);
  }

  async markRead(id: string): Promise<void> {
    const notification = await this.notificationRepo.findById(id);
    if (!notification) {
      throw new NotificationNotFoundError(id);
    }
    await this.notificationRepo.markAsRead(id);
  }
}
