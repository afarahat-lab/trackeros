import type { PoolClient } from 'pg';

import type { NotificationStatus } from '../../shared/types';
import type { Notification, CreateNotificationInput } from './notification.model';
import { InvalidNotificationError } from './notification.errors';
import { NotificationRepository } from './notification.repository';
import type { INotificationRepository } from './notification.repository';
import type { INotificationService } from './notification.service.interface';

export class NotificationService implements INotificationService {
  private readonly repository: INotificationRepository;

  constructor(repository?: INotificationRepository) {
    this.repository = repository ?? new NotificationRepository();
  }

  create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification> {
    const hasEntityType = (input.relatedEntityType ?? null) !== null;
    const hasEntityId = (input.relatedEntityId ?? null) !== null;
    if (hasEntityType !== hasEntityId) {
      throw new InvalidNotificationError(
        'relatedEntityType and relatedEntityId must either both be set or both be null'
      );
    }

    return this.repository.create(input, client);
  }

  findByRecipient(recipientId: string): Promise<Notification[]> {
    return this.repository.findByRecipient(recipientId);
  }

  findByEntity(relatedEntityType: string, relatedEntityId: string): Promise<Notification[]> {
    return this.repository.findByEntity(relatedEntityType, relatedEntityId);
  }

  updateStatus(
    id: string,
    status: NotificationStatus,
    client?: PoolClient
  ): Promise<Notification> {
    return this.repository.updateStatus(id, status, client);
  }

  markRead(id: string, client?: PoolClient): Promise<Notification> {
    return this.repository.markRead(id, client);
  }
}
