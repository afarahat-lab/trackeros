import pool from '../../shared/db/connection';
import { Notification, CreateNotificationDto, UpdateNotificationDto } from './notification.model';

export interface INotificationRepository {
  create(data: CreateNotificationDto): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  update(id: string, data: UpdateNotificationDto): Promise<Notification>;
  findUnreadByRecipient(recipientId: string): Promise<Notification[]>;
}

export class NotificationRepository implements INotificationRepository {
  async create(data: CreateNotificationDto): Promise<Notification> {
    const query = `
      INSERT INTO notifications (recipient_id, sender_id, type, title, message, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.recipientId,
      data.senderId || null,
      data.type,
      data.title,
      data.message,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ];

    const result = await pool.query(query, values);
    return this.mapRowToNotification(result.rows[0]);
  }

  async findById(id: string): Promise<Notification | null> {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  async update(id: string, data: UpdateNotificationDto): Promise<Notification> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.isRead !== undefined) {
      setClauses.push(`is_read = $${paramIndex}`);
      values.push(data.isRead);
      paramIndex++;
    }

    if (data.readAt !== undefined) {
      setClauses.push(`read_at = $${paramIndex}`);
      values.push(data.readAt);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      const notification = await this.findById(id);
      if (!notification) {
        throw new Error(`Notification with ID ${id} not found`);
      }
      return notification;
    }

    values.push(id);
    const query = `
      UPDATE notifications
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Notification with ID ${id} not found`);
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  async findUnreadByRecipient(recipientId: string): Promise<Notification[]> {
    const query = 'SELECT * FROM notifications WHERE recipient_id = $1 AND is_read = false ORDER BY created_at DESC';
    const result = await pool.query(query, [recipientId]);

    return result.rows.map((row: any) => this.mapRowToNotification(row));
  }

  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      recipientId: row.recipient_id,
      senderId: row.sender_id,
      type: row.type,
      title: row.title,
      message: row.message,
      metadata: row.metadata,
      isRead: row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  }
}
