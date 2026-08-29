import type { PoolClient } from 'pg';

import { pool } from '../../shared/db/connection';
import { NotFoundError } from '../../shared/types/errors';
import {
  Notification,
  NotificationStatus,
  INotificationRepository
} from './notification.model';

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  status: string;
  created_at: Date;
  read_at: Date | null;
}

type NotificationStatusValue = 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';

const NOTIFICATION_STATUSES: readonly NotificationStatusValue[] = [
  'PENDING',
  'SENT',
  'READ',
  'ARCHIVED'
];

function isNotificationStatus(value: string): value is NotificationStatus {
  return (NOTIFICATION_STATUSES as readonly string[]).includes(value);
}

const COLUMNS = `id, recipient_id, type, title, message, related_entity_type,
  related_entity_id, status, created_at, read_at`;

function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    status: isNotificationStatus(row.status) ? row.status : 'PENDING',
    createdAt: row.created_at,
    readAt: row.read_at
  };
}

export class PgNotificationRepository implements INotificationRepository {
  async create(
    notification: Notification,
    client?: PoolClient
  ): Promise<Notification> {
    const db = client ?? pool;
    const result = await db.query(
      `INSERT INTO notifications (
         id, recipient_id, type, title, message, related_entity_type,
         related_entity_id, status, created_at, read_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${COLUMNS}`,
      [
        notification.id,
        notification.recipientId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedEntityType,
        notification.relatedEntityId,
        notification.status,
        notification.createdAt,
        notification.readAt
      ]
    );
    return mapRow(result.rows[0] as NotificationRow);
  }

  async findById(
    id: string,
    client?: PoolClient
  ): Promise<Notification | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT ${COLUMNS} FROM notifications WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] as NotificationRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByRecipient(
    recipientId: string,
    status?: NotificationStatus,
    client?: PoolClient
  ): Promise<Notification[]> {
    const db = client ?? pool;
    const params: unknown[] = [recipientId];
    let whereClause = 'recipient_id = $1';
    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const result = await db.query(
      `SELECT ${COLUMNS} FROM notifications
       WHERE ${whereClause}
       ORDER BY created_at DESC`,
      params
    );
    return (result.rows as NotificationRow[]).map(mapRow);
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    client?: PoolClient
  ): Promise<Notification> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE notifications
       SET status = $2,
           read_at = CASE WHEN $2 = 'READ' THEN NOW() ELSE read_at END
       WHERE id = $1
       RETURNING ${COLUMNS}`,
      [id, status]
    );
    const row = result.rows[0] as NotificationRow | undefined;
    if (!row) {
      throw new NotFoundError(`Notification ${id} not found`);
    }
    return mapRow(row);
  }
}
