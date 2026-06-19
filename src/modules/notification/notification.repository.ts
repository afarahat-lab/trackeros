import { Pool } from 'pg';
import { Notification, CreateNotificationDto, UpdateNotificationDto, INotificationRepository } from './notification.model';
import { AuditLogger } from '../../shared/services/audit-logger.service';

export class NotificationRepository implements INotificationRepository {
  private readonly auditLogger: AuditLogger;

  constructor(private readonly pool: Pool) {
    this.auditLogger = new AuditLogger();
  }

  async create(data: CreateNotificationDto): Promise<Notification> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

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

      const result = await client.query(query, values);
      const notification = this.mapRowToNotification(result.rows[0]);

      await this.auditLogger.log('notification', notification.id, 'created', {
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
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  async update(id: string, data: UpdateNotificationDto): Promise<Notification | null> {
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
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE notifications
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  async findUnreadByRecipient(recipientId: string): Promise<Notification[]> {
    const query = 'SELECT * FROM notifications WHERE recipient_id = $1 AND is_read = false ORDER BY created_at DESC';
    const result = await this.pool.query(query, [recipientId]);

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
