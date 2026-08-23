import { Notification, INotificationRepository } from './notification.model';

export class NotificationService {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  async send(
    recipientId: string,
    title: string,
    body: string,
    type: 'EMAIL' | 'IN_APP',
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    return this.notificationRepo.create({
      recipientId,
      title,
      body,
      type,
      metadata: metadata ?? null,
    });
  }

  async getForUser(recipientId: string, limit?: number): Promise<Notification[]> {
    return this.notificationRepo.findByRecipient(recipientId, limit);
  }

  async markRead(id: string): Promise<void> {
    return this.notificationRepo.markAsRead(id);
  }
}
