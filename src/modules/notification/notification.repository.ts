import { randomUUID } from 'crypto';
import { BaseRepository } from '../../shared/base-repository';
import { Notification, NotificationStatus, NotificationType } from './notification.model';
import { INotificationRepository } from './notification.repository.interface';

interface NotificationRow {
  [key: string]: unknown;
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  related_entity_type: string;
  related_entity_id: string;
  status: string;
  created_at: Date;
  read_at: Date | null;
}

const VALID_TYPES: string[] = [
  'LEAVE_SUBMITTED',
  'LEAVE_APPROVED',
  'LEAVE_REJECTED',
  'LEAVE_CANCELLED',
];

const VALID_STATUSES: string[] = [
  'PENDING',
  'SENT',
  'READ',
  'ARCHIVED',
];

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    relatedEntityType: 'LeaveRequest',
    relatedEntityId: row.related_entity_id,
    status: row.status as NotificationStatus,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function isNotificationRow(row: unknown): row is NotificationRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.recipient_id === 'string' &&
    typeof r.type === 'string' &&
    VALID_TYPES.includes(r.type) &&
    typeof r.title === 'string' &&
    typeof r.message === 'string' &&
    typeof r.related_entity_type === 'string' &&
    r.related_entity_type === 'LeaveRequest' &&
    typeof r.related_entity_id === 'string' &&
    typeof r.status === 'string' &&
    VALID_STATUSES.includes(r.status) &&
    r.created_at instanceof Date &&
    (r.read_at === null || r.read_at instanceof Date)
  );
}

class NotificationBaseRepository extends BaseRepository {}

export class PgNotificationRepository implements INotificationRepository {
  private readonly base = new NotificationBaseRepository();
  private readonly table = 'notifications';

  async findById(id: string): Promise<Notification | null> {
    const result = await this.base.query<NotificationRow>(
      `SELECT * FROM ${this.table} WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row || !isNotificationRow(row)) return null;
    return rowToNotification(row);
  }

  async findByRecipient(recipientId: string, status?: NotificationStatus): Promise<Notification[]> {
    if (status !== undefined) {
      const result = await this.base.query<NotificationRow>(
        `SELECT * FROM ${this.table} WHERE recipient_id = $1 AND status = $2`,
        [recipientId, status]
      );
      return result.rows.filter(isNotificationRow).map(rowToNotification);
    }
    const result = await this.base.query<NotificationRow>(
      `SELECT * FROM ${this.table} WHERE recipient_id = $1`,
      [recipientId]
    );
    return result.rows.filter(isNotificationRow).map(rowToNotification);
  }

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const id = randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = {
      id,
      recipient_id: notification.recipientId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_entity_type: notification.relatedEntityType,
      related_entity_id: notification.relatedEntityId,
      status: notification.status,
      created_at: now,
      read_at: notification.readAt ?? null,
    };
    const result = await this.base.query<NotificationRow>(
      `INSERT INTO ${this.table} (id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        data.id,
        data.recipient_id,
        data.type,
        data.title,
        data.message,
        data.related_entity_type,
        data.related_entity_id,
        data.status,
        data.created_at,
        data.read_at,
      ]
    );
    const row = result.rows[0];
    if (!row || !isNotificationRow(row)) {
      throw new Error('Failed to create notification');
    }
    return rowToNotification(row);
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<Notification | null> {
    const result = await this.base.query<NotificationRow>(
      `UPDATE ${this.table} SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    const row = result.rows[0];
    if (!row || !isNotificationRow(row)) return null;
    return rowToNotification(row);
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const now = new Date();
    const result = await this.base.query<NotificationRow>(
      `UPDATE ${this.table} SET status = $1, read_at = $2 WHERE id = $3 RETURNING *`,
      ['READ', now, id]
    );
    const row = result.rows[0];
    if (!row || !isNotificationRow(row)) return null;
    return rowToNotification(row);
  }

  async findByRelatedEntity(entityType: string, entityId: string): Promise<Notification[]> {
    const result = await this.base.query<NotificationRow>(
      `SELECT * FROM ${this.table} WHERE related_entity_type = $1 AND related_entity_id = $2`,
      [entityType, entityId]
    );
    return result.rows.filter(isNotificationRow).map(rowToNotification);
  }
}
