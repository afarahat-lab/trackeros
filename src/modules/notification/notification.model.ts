import type { PoolClient } from 'pg';

export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationInput {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export interface INotificationRepository {
  create(notification: Notification, client?: PoolClient): Promise<Notification>;
  findById(id: string, client?: PoolClient): Promise<Notification | null>;
  findByRecipient(
    recipientId: string,
    status?: NotificationStatus,
    client?: PoolClient
  ): Promise<Notification[]>;
  updateStatus(
    id: string,
    status: NotificationStatus,
    client?: PoolClient
  ): Promise<Notification>;
}

export interface INotificationService {
  notify(input: NotificationInput, client?: PoolClient): Promise<Notification>;
}
