import { pool } from '../../shared/db/connection';
import { Notification, NotificationStatus } from './notification.model';

export interface INotificationRepository {
  create(notification: CreateNotificationInput): Promise<Notification>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  markSent(id: string): Promise<Notification | null>;
  markRead(id: string): Promise<Notification | null>;
}

export interface CreateNotificationInput {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

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
    type: row.type,
    title: row.title,
    message: row.message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    status: row.status as NotificationStatus,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export class NotificationRepository implements INotificationRepository {
  async create(notification: CreateNotificationInput): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (
        id, recipient_id, type, title, message,
        related_entity_type, related_entity_id, status, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, 'PENDING', NOW()
      ) RETURNING *`,
      [
        notification.id,
        notification.recipientId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedEntityType,
        notification.relatedEntityId,
      ],
    );
    return mapRowToNotification(result.rows[0] as NotificationRow);
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC',
      [recipientId],
    );
    return result.rows.map((row: NotificationRow) => mapRowToNotification(row));
  }

  async markSent(id: string): Promise<Notification | null> {
    const result = await pool.query(
      `UPDATE notifications SET status = 'SENT' WHERE id = $1 RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToNotification(result.rows[0] as NotificationRow);
  }

  async markRead(id: string): Promise<Notification | null> {
    const result = await pool.query(
      `UPDATE notifications SET status = 'READ', read_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToNotification(result.rows[0] as NotificationRow);
  }
}
