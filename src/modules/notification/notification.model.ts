import { PoolClient } from 'pg';
import { NotificationType } from '../../shared/types';

export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}

/**
 * Thrown when a notification status transition is not permitted (e.g. marking
 * an ARCHIVED notification as READ). readAt is only ever set on a transition
 * into READ.
 */
export class InvalidNotificationTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidNotificationTransitionError';
  }
}

export interface INotificationRepository {
  create(notification: Notification, client?: PoolClient): Promise<Notification>;
  findById(id: string, client?: PoolClient): Promise<Notification | null>;
  findByRecipient(recipientId: string, client?: PoolClient): Promise<Notification[]>;
  /**
   * Transitions a notification into READ and stamps readAt. Only PENDING and
   * SENT notifications may become READ; any other status raises
   * InvalidNotificationTransitionError.
   */
  markRead(id: string, client?: PoolClient): Promise<Notification>;
}

export type CreateNotificationInput = Omit<
  Notification,
  'id' | 'createdAt' | 'readAt' | 'status'
>;

export interface INotificationService {
  create(input: CreateNotificationInput): Promise<Notification>;
  markRead(id: string): Promise<Notification>;
  findByRecipient(recipientId: string, client?: PoolClient): Promise<Notification[]>;
}
