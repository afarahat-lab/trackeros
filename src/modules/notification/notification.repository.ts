import { Pool } from 'pg';
import { Notification, CreateNotificationDto, UpdateNotificationDto, INotificationRepository } from './notification.model';
import pool from '../../shared/db/connection';
import { AuditLogger } from '../../shared/audit/audit.logger';

export class NotificationRepository implements INotificationRepository {
  private readonly auditLogger: AuditLogger;

  constructor(private readonly dbPool: Pool = pool) {
    this.auditLogger = new AuditLogger();
  }

  private validateCreateDto(dto: CreateNotificationDto): void {
    if (!dto.recipientId) {
      throw new Error('recipientId is required');
    }
    if (!dto.type) {
      throw new Error('type is required');
    }
    const validTypes = ['leave_request', 'leave_approval', 'leave_rejection', 'balance_update', 'policy_change'];
    if (!validTypes.includes(dto.type)) {
      throw new Error(`Invalid notification type: ${dto.type}`);
    }
    if (!dto.title) {
      throw new Error('title is required');
    }
    if (!dto.message) {
      throw new Error('message is required');
    }
  }

  async create(data: CreateNotificationDto): Promise<Notification> {
    this.validateCreateDto(data);

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

    const result = await this.dbPool.query(query, values);
    const notification = result.rows[0];

    this.auditLogger.log('CREATE', {
      entityType: 'NOTIFICATION',
      entityId: notification.id,
      recipientId: data.recipientId,
      type: data.type,
      title: data.title,
    });

    return notification;
  }

  async findById(id: string): Promise<Notification | null> {
    if (!id) {
      throw new Error('id is required');
    }

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
    const result = await this.dbPool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async update(id: string, data: UpdateNotificationDto): Promise<Notification | null> {
    if (!id) {
      throw new Error('id is required');
    }

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

    const result = await this.dbPool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Notification with ID ${id} not found`);
    }

    this.auditLogger.log('UPDATE', {
      entityType: 'NOTIFICATION',
      entityId: id,
      updates: data,
    });

    return result.rows[0];
  }

  async findUnreadByRecipient(recipientId: string): Promise<Notification[]> {
    if (!recipientId) {
      throw new Error('recipientId is required');
    }

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
    const result = await this.dbPool.query(query, [recipientId]);

    return result.rows;
  }
}
