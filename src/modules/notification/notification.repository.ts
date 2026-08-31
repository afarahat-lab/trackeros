import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { NotificationType } from '../../shared/types';
import {
  InvalidNotificationTransitionError,
  INotificationRepository,
  Notification,
} from './notification.model';

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  status: Notification['status'];
  created_at: Date;
  read_at: Date | null;
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    status: row.status,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export class PgNotificationRepository implements INotificationRepository {
  async create(
    notification: Notification,
    client?: PoolClient,
  ): Promise<Notification> {
    const db = client ?? pool;
    const result = await db.query<NotificationRow>(
      `INSERT INTO notifications (
         id, recipient_id, type, title, message, related_entity_type,
         related_entity_id, status, created_at, read_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        notification.id,
        notification.recipientId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedEntityType,
        notification.relatedEntityId,
        notification.status,
        notification.createdAt,
        notification.readAt,
      ],
    );
    return toNotification(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<Notification | null> {
    const db = client ?? pool;
    const result = await db.query<NotificationRow>(
      `SELECT * FROM notifications WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toNotification(result.rows[0]) : null;
  }

  async findByRecipient(
    recipientId: string,
    client?: PoolClient,
  ): Promise<Notification[]> {
    const db = client ?? pool;
    const result = await db.query<NotificationRow>(
      `SELECT * FROM notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC`,
      [recipientId],
    );
    return result.rows.map(toNotification);
  }

  async markRead(id: string, client?: PoolClient): Promise<Notification> {
    const db = client ?? pool;
    const result = await db.query<NotificationRow>(
      `UPDATE notifications
       SET status = 'READ', read_at = NOW()
       WHERE id = $1 AND status IN ('PENDING', 'SENT')
       RETURNING *`,
      [id],
    );
    if (!result.rows[0]) {
      throw new InvalidNotificationTransitionError(
        `notification ${id} cannot transition to READ from its current status`,
      );
    }
    return toNotification(result.rows[0]);
  }
}
