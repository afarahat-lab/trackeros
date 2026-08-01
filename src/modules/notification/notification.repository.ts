import { pool } from '../../shared/db/connection';
import {
  Notification,
  NotificationStatus,
  INotificationRepository,
} from './notification.model';

export class NotificationRepository implements INotificationRepository {
  async findByRecipientId(recipientId: string): Promise<Notification[]> {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC`,
      [recipientId],
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async create(
    data: Omit<Notification, 'id' | 'createdAt' | 'readAt'>,
  ): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (recipient_id, type, title, message, related_entity_type, related_entity_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.recipientId,
        data.type,
        data.title,
        data.message,
        data.relatedEntityType,
        data.relatedEntityId,
        data.status,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const result = await pool.query(
      `UPDATE notifications
       SET status = 'READ', read_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<Notification | null> {
    const result = await pool.query(
      `UPDATE notifications
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      recipientId: row.recipient_id as string,
      type: row.type as string,
      title: row.title as string,
      message: row.message as string,
      relatedEntityType: (row.related_entity_type as string) ?? null,
      relatedEntityId: (row.related_entity_id as string) ?? null,
      status: row.status as NotificationStatus,
      createdAt: new Date(row.created_at as string),
      readAt: row.read_at ? new Date(row.read_at as string) : null,
    };
  }
}
