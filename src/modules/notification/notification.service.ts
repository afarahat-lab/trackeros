import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { IUnitOfWork } from '../../shared/db/unit-of-work';
import {
  CreateNotificationInput,
  INotificationService,
  Notification,
} from './notification.model';
import { PgNotificationRepository } from './notification.repository';

export class NotificationService implements INotificationService {
  constructor(
    private readonly notifications: PgNotificationRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification: Notification = {
      id: randomUUID(),
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      status: 'PENDING',
      createdAt: new Date(),
      readAt: null,
    };
    return this.notifications.create(notification);
  }

  async markRead(id: string): Promise<Notification> {
    return this.uow.withTransaction((client) =>
      this.notifications.markRead(id, client),
    );
  }

  async findByRecipient(
    recipientId: string,
    client?: PoolClient,
  ): Promise<Notification[]> {
    return this.notifications.findByRecipient(recipientId, client);
  }
}
