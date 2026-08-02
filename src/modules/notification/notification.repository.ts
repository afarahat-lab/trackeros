import { randomUUID } from 'crypto';
import { pool } from '../../shared/db/connection';
import type { Notification, NotificationStatus } from './notification.model';

interface NotificationRow {
  id: string;
  recipient_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_at: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    body: row.body,
    sentAt: row.sent_at,
    status: row.status as NotificationStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface INotificationRepository {
  create(
    notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Notification>;

  updateStatus(id: string, status: string): Promise<Notification | null>;

  findByRecipient(recipientId: string): Promise<Notification[]>;
}

export class PgNotificationRepository implements INotificationRepository {
  async create(
    notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Notification> {
    const id = randomUUID();
    const now = new Date();
    const result = await pool.query<NotificationRow>(
      `INSERT INTO notifications (
        id, recipient_id, recipient_email, subject, body,
        sent_at, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        notification.recipientId,
        notification.recipientEmail,
        notification.subject,
        notification.body,
        notification.sentAt,
        notification.status,
        now,
        now,
      ],
    );
    return rowToNotification(result.rows[0]);
  }

  async updateStatus(id: string, status: string): Promise<Notification | null> {
    const now = new Date();
    const sentAt = status === 'SENT' ? now : null;

    const result = await pool.query<NotificationRow>(
      `UPDATE notifications
       SET status = $1, updated_at = $2, sent_at = COALESCE($3, sent_at)
       WHERE id = $4
       RETURNING *`,
      [status, now, sentAt, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToNotification(result.rows[0]);
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    const result = await pool.query<NotificationRow>(
      'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC',
      [recipientId],
    );
    return result.rows.map(rowToNotification);
  }
}
