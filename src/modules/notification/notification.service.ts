import type { PoolClient } from 'pg';
import { randomUUID } from 'crypto';

import {
  Notification,
  NotificationInput,
  INotificationRepository,
  INotificationService
} from './notification.model';
import { PgNotificationRepository } from './notification.repository';
import { ValidationError } from '../../shared/types/errors';

export class NotificationService implements INotificationService {
  private readonly repository: INotificationRepository;

  constructor(
    repository: INotificationRepository = new PgNotificationRepository()
  ) {
    this.repository = repository;
  }

  async notify(
    input: NotificationInput,
    client?: PoolClient
  ): Promise<Notification> {
    const hasType = input.relatedEntityType != null;
    const hasId = input.relatedEntityId != null;
    if (hasType !== hasId) {
      throw new ValidationError(
        'relatedEntityType and relatedEntityId must both be provided or both be null'
      );
    }

    const notification: Notification = {
      id: randomUUID(),
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      status: 'PENDING',
      createdAt: new Date(),
      readAt: null
    };
    return this.repository.create(notification, client);
  }
}
