import { randomUUID } from 'crypto';
import { Notification } from './notification.model';
import { INotificationRepository } from './notification.repository';

export interface INotificationService {
  notify(
    recipientId: string,
    type: string,
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
  ): Promise<Notification>;
}

export class NotificationService implements INotificationService {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async notify(
    recipientId: string,
    type: string,
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
  ): Promise<Notification> {
    const id = randomUUID();
    return this.notificationRepository.create({
      id,
      recipientId,
      type,
      title,
      message,
      relatedEntityType: relatedEntityType ?? null,
      relatedEntityId: relatedEntityId ?? null,
    });
  }
}
