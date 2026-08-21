import { randomUUID } from 'crypto';
import { pool } from '../../shared/db/connection';
import { NotificationStatus } from '../../shared/types';
import { INotificationRepository, Notification } from './notification.model';

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  status: string;
  created_at: Date;
  read_at: Date | null;
}

function mapRowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type as Notification['type'],
    title: row.title,
    message: row.message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    status: row.status as NotificationStatus,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export class PgNotificationRepository implements INotificationRepository {
  async findByRecipientId(recipientId: string): Promise<Notification[]> {
    const result = await pool.query<NotificationRow>(
      'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC',
      [recipientId],
    );
    return result.rows.map(mapRowToNotification);
  }

  async findByRecipientIdAndStatus(
    recipientId: string,
    status: NotificationStatus,
  ): Promise<Notification[]> {
    const result = await pool.query<NotificationRow>(
      'SELECT * FROM notifications WHERE recipient_id = $1 AND status = $2 ORDER BY created_at DESC',
      [recipientId, status],
    );
    return result.rows.map(mapRowToNotification);
  }

  async create(
    notification: Omit<Notification, 'id' | 'createdAt'>,
  ): Promise<Notification> {
    const id = randomUUID();
    const result = await pool.query<NotificationRow>(
      `INSERT INTO notifications (
        id, recipient_id, type, title, message,
        related_entity_type, related_entity_id, status, created_at, read_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      RETURNING *`,
      [
        id,
        notification.recipientId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedEntityType,
        notification.relatedEntityId,
        notification.status,
        notification.readAt ?? null,
      ],
    );
    return mapRowToNotification(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    readAt?: Date,
  ): Promise<Notification | null> {
    const result = await pool.query<NotificationRow>(
      `UPDATE notifications
       SET status = $2, read_at = COALESCE($3, read_at)
       WHERE id = $1
       RETURNING *`,
      [id, status, readAt ?? null],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToNotification(result.rows[0]);
  }
}
