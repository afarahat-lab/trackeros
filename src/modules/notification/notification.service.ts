import type { PoolClient } from 'pg';

import { NotificationStatus } from '../../shared/types';
import type { Notification, CreateNotificationInput } from './notification.model';
import { NotificationRepository } from './notification.repository';
import type { INotificationRepository } from './notification.repository';

export class NotificationService {
  private readonly repository: INotificationRepository;

  constructor(repository?: INotificationRepository) {
    this.repository = repository ?? new NotificationRepository();
  }

  create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification> {
    return this.repository.create(input, client);
  }

  findByRecipient(recipientId: string): Promise<Notification[]> {
    return this.repository.findByRecipient(recipientId);
  }

  findByEntity(entityType: string, entityId: string): Promise<Notification[]> {
    return this.repository.findByEntity(entityType, entityId);
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
