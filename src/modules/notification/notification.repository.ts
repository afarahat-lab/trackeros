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
      RETURNING
        id,
        recipient_id AS "recipientId",
        sender_id AS "senderId",
        type,
        title,
        message,
        metadata,
        is_read AS "isRead",
        read_at AS "readAt",
        created_at AS "createdAt"
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
      SELECT
        id,
        recipient_id AS "recipientId",
        sender_id AS "senderId",
        type,
        title,
        message,
        metadata,
        is_read AS "isRead",
        read_at AS "readAt",
        created_at AS "createdAt"
      FROM notifications
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
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
      throw new Error('No fields to update');
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);
    const query = `
      UPDATE notifications
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        recipient_id AS "recipientId",
        sender_id AS "senderId",
        type,
        title,
        message,
        metadata,
        is_read AS "isRead",
        read_at AS "readAt",
        created_at AS "createdAt"
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Notification with id ${id} not found`);
    }

    return result.rows[0];
  }

  async findUnreadByRecipient(recipientId: string): Promise<Notification[]> {
    const query = `
      SELECT
        id,
        recipient_id AS "recipientId",
        sender_id AS "senderId",
        type,
        title,
        message,
        metadata,
        is_read AS "isRead",
        read_at AS "readAt",
        created_at AS "createdAt"
      FROM notifications
      WHERE recipient_id = $1 AND is_read = false
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [recipientId]);

    return result.rows;
  }
}
