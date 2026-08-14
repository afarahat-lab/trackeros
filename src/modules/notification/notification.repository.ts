import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { Notification } from './notification.model';
import {
  INotificationRepository,
  CreateNotificationDto,
} from './notification.repository.interface';

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED';
  title: string;
  message: string;
  related_entity_type: 'LeaveRequest';
  related_entity_id: string;
  status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';
  created_at: Date;
  read_at: Date | null;
}

type Queryable = Pick<Pool, 'query'>;

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    status: row.status,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

const COLUMNS = [
  'id',
  'recipient_id',
  'type',
  'title',
  'message',
  'related_entity_type',
  'related_entity_id',
  'status',
  'created_at',
  'read_at',
].join(', ');

export class NotificationRepository implements INotificationRepository {
  private readonly db: Queryable;

  constructor(client?: Queryable) {
    this.db = client ?? pool;
  }

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const result = await this.db.query<NotificationRow>(
      `INSERT INTO notifications (recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW(), NULL)
       RETURNING ${COLUMNS}`,
      [
        dto.recipientId,
        dto.type,
        dto.title,
        dto.message,
        dto.relatedEntityType,
        dto.relatedEntityId,
      ],
    );
    return rowToNotification(result.rows[0]);
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    const result = await this.db.query<NotificationRow>(
      `SELECT ${COLUMNS} FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC`,
      [recipientId],
    );
    return result.rows.map(rowToNotification);
  }

  async markAsSent(id: string): Promise<Notification | null> {
    const result = await this.db.query<NotificationRow>(
      `UPDATE notifications SET status = 'SENT' WHERE id = $1
       RETURNING ${COLUMNS}`,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToNotification(result.rows[0]);
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const result = await this.db.query<NotificationRow>(
      `UPDATE notifications SET status = 'READ', read_at = NOW() WHERE id = $1
       RETURNING ${COLUMNS}`,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToNotification(result.rows[0]);
  }

  async createBatch(dtos: CreateNotificationDto[]): Promise<Notification[]> {
    if (dtos.length === 0) {
      return [];
    }

    const valuePlaceholders: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const dto of dtos) {
      valuePlaceholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 'PENDING', NOW(), NULL)`,
      );
      values.push(
        dto.recipientId,
        dto.type,
        dto.title,
        dto.message,
        dto.relatedEntityType,
        dto.relatedEntityId,
      );
    }

    const result = await this.db.query<NotificationRow>(
      `INSERT INTO notifications (recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at)
       VALUES ${valuePlaceholders.join(', ')}
       RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows.map(rowToNotification);
  }
}
