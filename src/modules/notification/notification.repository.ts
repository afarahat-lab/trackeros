import { Pool } from 'pg';
import { Notification, CreateNotificationDto, UpdateNotificationDto, INotificationRepository } from './notification.model';
import { AuditLogger } from '../../shared/audit/audit.logger';

export class NotificationRepository implements INotificationRepository {
  constructor(
    private readonly pool: Pool,
    private readonly auditLogger: AuditLogger
  ) {}

  async create(data: CreateNotificationDto): Promise<Notification> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

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

      const result = await client.query(query, values);
      const notification = result.rows[0];

      this.auditLogger.log('notification.created', {
        entityType: 'notification',
        entityId: notification.id,
        recipientId: data.recipientId,
        type: data.type,
      });

      await client.query('COMMIT');
      return notification;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  async update(id: string, data: UpdateNotificationDto): Promise<Notification | null> {
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
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        UPDATE notifications
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
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

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const notification = result.rows[0];

      this.auditLogger.log('notification.updated', {
        entityType: 'notification',
        entityId: notification.id,
        changes: data,
      });

      await client.query('COMMIT');
      return notification;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
