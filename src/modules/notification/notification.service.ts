import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { IUnitOfWork } from '../../shared/db/unit-of-work';
import { NotificationType } from '../../shared/types';
import {
  CreateNotificationInput,
  INotificationService,
  InvalidNotificationTransitionError,
  Notification,
} from './notification.model';
import { PgNotificationRepository } from './notification.repository';

function assertKnownNotificationType(type: NotificationType): void {
  if (!Object.values(NotificationType).includes(type)) {
    throw new InvalidNotificationTransitionError(
      `Unknown notification type: ${String(type)}`,
    );
  }
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly notifications: PgNotificationRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    assertKnownNotificationType(input.type);
    const now = new Date();
    const notification: Notification = {
      id: randomUUID(),
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      status: 'PENDING',
      createdAt: now,
      readAt: null,
    };
    return this.notifications.create(notification);
  }

  markRead(id: string): Promise<Notification> {
    return this.uow.withTransaction((client: PoolClient) =>
      this.notifications.markRead(id, client),
    );
  }

  findByRecipient(
    recipientId: string,
    client?: PoolClient,
  ): Promise<Notification[]> {
    return this.notifications.findByRecipient(recipientId, client);
  }
}
