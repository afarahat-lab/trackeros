import { PoolClient } from 'pg';
import { Notification, CreateNotificationInput } from './notification.model';

export interface INotificationRepository {
  create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification>;
  findById(id: string, client?: PoolClient): Promise<Notification | null>;
  updateStatus(
    id: string,
    status: Notification['status'],
    readAt: Date | null,
    client?: PoolClient
  ): Promise<Notification | null>;
}
