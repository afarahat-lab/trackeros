import { randomUUID } from 'crypto';
import type { Pool, PoolClient } from 'pg';

import { pool } from '../../shared/db';
import { NotificationStatus } from '../../shared/types';
import { RepositoryError } from '../employee';
import type { Notification, CreateNotificationInput } from './notification.model';

const NOTIFICATION_COLUMNS =
  'id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at';

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

export class NotificationNotFoundError extends RepositoryError {
  constructor(id: string) {
    super('NOTIFICATION_NOT_FOUND', `Notification with id '${id}' not found`);
    this.name = 'NotificationNotFoundError';
  }
}

export interface INotificationRepository {
  create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  findByEntity(entityType: string, entityId: string): Promise<Notification[]>;
  updateStatus(id: string, status: NotificationStatus, client?: PoolClient): Promise<Notification>;
  markRead(id: string, client?: PoolClient): Promise<Notification>;
}

function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    status: row.status as NotificationStatus,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export class NotificationRepository implements INotificationRepository {
  async create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();
    const status = input.status ?? NotificationStatus.PENDING;

    const relatedEntityType = input.relatedEntityType ?? null;
    const relatedEntityId = input.relatedEntityId ?? null;
    if ((relatedEntityType === null) !== (relatedEntityId === null)) {
      throw new RepositoryError(
        'INVALID_NOTIFICATION',
        'relatedEntityType and relatedEntityId must be provided together'
      );
    }

    const result = await conn.query<NotificationRow>(
      `INSERT INTO notifications
         (id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${NOTIFICATION_COLUMNS}`,
      [
        randomUUID(),
        input.recipientId,
        input.type,
        input.title,
        input.message,
        relatedEntityType,
        relatedEntityId,
        status,
        now,
        null,
      ]
    );

    return mapRow(result.rows[0]);
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    const result = await pool.query<NotificationRow>(
      `SELECT ${NOTIFICATION_COLUMNS}
       FROM notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC, id ASC`,
      [recipientId]
    );

    return result.rows.map(mapRow);
  }

  async findByEntity(entityType: string, entityId: string): Promise<Notification[]> {
    const result = await pool.query<NotificationRow>(
      `SELECT ${NOTIFICATION_COLUMNS}
       FROM notifications
       WHERE related_entity_type = $1 AND related_entity_id = $2
       ORDER BY created_at DESC, id ASC`,
      [entityType, entityId]
    );

    return result.rows.map(mapRow);
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    client?: PoolClient
  ): Promise<Notification> {
    const conn: Pool | PoolClient = client ?? pool;

    const result = await conn.query<NotificationRow>(
      `UPDATE notifications
       SET status = $2
       WHERE id = $1
       RETURNING ${NOTIFICATION_COLUMNS}`,
      [id, status]
    );

    if (result.rows.length === 0) {
      throw new NotificationNotFoundError(id);
    }

    return mapRow(result.rows[0]);
  }

  async markRead(id: string, client?: PoolClient): Promise<Notification> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const result = await conn.query<NotificationRow>(
      `UPDATE notifications
       SET status = $2, read_at = $3
       WHERE id = $1
       RETURNING ${NOTIFICATION_COLUMNS}`,
      [id, NotificationStatus.READ, now]
    );

    if (result.rows.length === 0) {
      throw new NotificationNotFoundError(id);
    }

    return mapRow(result.rows[0]);
  }
}
