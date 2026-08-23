import { pool } from 'shared/db/connection';
import { Notification, INotificationRepository } from './notification.model';
import { randomUUID } from 'crypto';

type DbRow = Record<string, unknown>;

export class NotificationRepository implements INotificationRepository {
  async create(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const id = randomUUID();
    const isRead = false;
    const createdAt = new Date();

    const result = await pool.query(
      `INSERT INTO notifications (
        id, recipient_id, title, body, type, is_read, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        notification.recipientId,
        notification.title,
        notification.body,
        notification.type,
        isRead,
        notification.metadata ? JSON.stringify(notification.metadata) : null,
        createdAt,
      ]
    );

    const rows = result.rows as DbRow[];
    return this.mapRow(rows[0]);
  }

  async findByRecipient(recipientId: string, limit?: number): Promise<Notification[]> {
    const query = limit
      ? 'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT $2'
      : 'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC';
    const params: unknown[] = limit ? [recipientId, limit] : [recipientId];

    const result = await pool.query(query, params);
    const rows = result.rows as DbRow[];
    return rows.map((row) => this.mapRow(row));
  }

  async markAsRead(id: string): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1',
      [id]
    );
  }

  private mapRow(row: DbRow): Notification {
    return {
      id: row.id as string,
      recipientId: row.recipient_id as string,
      title: row.title as string,
      body: row.body as string,
      type: row.type as 'EMAIL' | 'IN_APP',
      isRead: row.is_read as boolean,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.created_at as Date,
    };
  }
}
