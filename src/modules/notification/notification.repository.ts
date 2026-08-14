import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { Notification } from './notification.model';
import { NotificationStatus } from '../../shared/types/leave.types';
import { UniqueConstraintViolationError } from '../employee/employee.repository';

export interface INotificationRepository {
  create(
    input: Omit<Notification, 'id' | 'createdAt' | 'readAt'>,
    client?: PoolClient,
  ): Promise<Notification>;

  findByRecipientId(
    recipientId: string,
    client?: PoolClient,
  ): Promise<Notification[]>;

  markAsSent(
    id: string,
    client?: PoolClient,
  ): Promise<Notification | null>;

  markAsRead(
    id: string,
    client?: PoolClient,
  ): Promise<Notification | null>;
}

export class PgNotificationRepository implements INotificationRepository {
  async create(
    input: Omit<Notification, 'id' | 'createdAt' | 'readAt'>,
    client?: PoolClient,
  ): Promise<Notification> {
    const db = client ?? pool;
    try {
      const result = await db.query(
        `INSERT INTO notifications (
          recipient_id, type, title, message,
          related_entity_type, related_entity_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          input.recipientId,
          input.type,
          input.title,
          input.message,
          input.relatedEntityType ?? null,
          input.relatedEntityId ?? null,
          input.status,
        ],
      );
      return this.rowToNotification(result.rows[0]);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new UniqueConstraintViolationError(
          'Unique constraint violation on notifications',
          error,
        );
      }
      throw error;
    }
  }

  async findByRecipientId(
    recipientId: string,
    client?: PoolClient,
  ): Promise<Notification[]> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC',
      [recipientId],
    );
    return result.rows.map((row) => this.rowToNotification(row));
  }

  async markAsSent(
    id: string,
    client?: PoolClient,
  ): Promise<Notification | null> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE notifications
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [NotificationStatus.SENT, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToNotification(result.rows[0]);
  }

  async markAsRead(
    id: string,
    client?: PoolClient,
  ): Promise<Notification | null> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE notifications
       SET status = $1, read_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [NotificationStatus.READ, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToNotification(result.rows[0]);
  }

  private rowToNotification(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      recipientId: row.recipient_id as string,
      type: row.type as Notification['type'],
      title: row.title as string,
      message: row.message as string,
      relatedEntityType: (row.related_entity_type as Notification['relatedEntityType']) ?? null,
      relatedEntityId: (row.related_entity_id as string) ?? null,
      status: row.status as NotificationStatus,
      createdAt: new Date(row.created_at as string),
      readAt: row.read_at ? new Date(row.read_at as string) : null,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as Record<string, unknown>).code === '23505'
    );
  }
}
