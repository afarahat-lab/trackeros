import type { PoolClient } from 'pg';

import type { NotificationStatus } from '../../shared/types';
import type { Notification, CreateNotificationInput } from './notification.model';

export interface INotificationService {
  create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  findByEntity(relatedEntityType: string, relatedEntityId: string): Promise<Notification[]>;
  updateStatus(
    id: string,
    status: NotificationStatus,
    client?: PoolClient
  ): Promise<Notification>;
  markRead(id: string, client?: PoolClient): Promise<Notification>;
}
