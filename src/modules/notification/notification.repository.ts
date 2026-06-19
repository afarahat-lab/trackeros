import { Pool } from 'pg';
import { Notification, CreateNotificationDto, UpdateNotificationDto } from './notification.model';

export interface INotificationRepository {
  create(data: CreateNotificationDto): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  update(id: string, data: UpdateNotificationDto): Promise<Notification>;
  findUnreadByRecipient(recipientId: string): Promise<Notification[]>;
}

export class NotificationRepository implements INotificationRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async create(data: CreateNotificationDto): Promise<Notification> {
    const query = `
      INSERT INTO notifications (recipient_id, sender_id, type, title, message, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, recipient_id AS "recipientId", sender_id AS "senderId", type, title, message, metadata, is_read AS "isRead", read_at AS "readAt", created_at AS "createdAt"
    `;
    const values = [
      data.recipientId,
      data.senderId || null,
      data.type,
      data.title,
      data.message,
      data.metadata || null,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Notification | null> {
    const query = `
      SELECT id, recipient_id AS "recipientId", sender_id AS "senderId", type, title, message, metadata, is_read AS "isRead", read_at AS "readAt", created_at AS "createdAt"
      FROM notifications
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async update(id: string, data: UpdateNotificationDto): Promise<Notification> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.isRead !== undefined) {
      updates.push(`is_read = $${paramCount}`);
      values.push(data.isRead);
      paramCount++;
    }

    if (data.readAt !== undefined) {
      updates.push(`read_at = $${paramCount}`);
      values.push(data.readAt);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE notifications
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, recipient_id AS "recipientId", sender_id AS "senderId", type, title, message, metadata, is_read AS "isRead", read_at AS "readAt", created_at AS "createdAt"
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Notification with id ${id} not found`);
    }

    return result.rows[0];
  }

  async findUnreadByRecipient(recipientId: string): Promise<Notification[]> {
    const query = `
      SELECT id, recipient_id AS "recipientId", sender_id AS "senderId", type, title, message, metadata, is_read AS "isRead", read_at AS "readAt", created_at AS "createdAt"
      FROM notifications
      WHERE recipient_id = $1 AND is_read = false
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [recipientId]);
    return result.rows;
  }
}
