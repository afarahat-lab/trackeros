import { randomUUID } from 'crypto';
import type { Pool, PoolClient } from 'pg';

import { pool } from '../../shared/db';
import { NotificationStatus } from '../../shared/types';
import { UniqueConstraintError } from '../employee/index';
import { NotificationNotFoundError } from './notification.errors';
import type { Notification, CreateNotificationInput } from './notification.model';

const NOTIFICATION_COLUMNS =
  'id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at';

const UNIQUE_CONSTRAINT_CODE = '23505';

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

export interface INotificationRepository {
  create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  findByEntity(relatedEntityType: string, relatedEntityId: string): Promise<Notification[]>;
  updateStatus(
    id: string,
    status: NotificationStatus,
    client?: PoolClient
  ): Promise<Notification>;
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

interface PgError {
  code: string;
}

function isPgError(err: unknown): err is PgError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

function isPgUniqueViolation(err: unknown): err is PgError {
  return isPgError(err) && err.code === UNIQUE_CONSTRAINT_CODE;
}

export class NotificationRepository implements INotificationRepository {
  async create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    try {
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
          input.relatedEntityType ?? null,
          input.relatedEntityId ?? null,
          input.status ?? NotificationStatus.PENDING,
          now,
          null,
        ]
      );

      return mapRow(result.rows[0]);
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new UniqueConstraintError(
          'DUPLICATE_NOTIFICATION',
          'A notification with these values already exists'
        );
      }
      throw err;
    }
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    const result = await pool.query<NotificationRow>(
      `SELECT ${NOTIFICATION_COLUMNS} FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC`,
      [recipientId]
    );

    return result.rows.map(mapRow);
  }

  async findByEntity(
    relatedEntityType: string,
    relatedEntityId: string
  ): Promise<Notification[]> {
    const result = await pool.query<NotificationRow>(
      `SELECT ${NOTIFICATION_COLUMNS} FROM notifications WHERE related_entity_type = $1 AND related_entity_id = $2 ORDER BY created_at DESC`,
      [relatedEntityType, relatedEntityId]
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
      `UPDATE notifications SET status = $2 WHERE id = $1 RETURNING ${NOTIFICATION_COLUMNS}`,
      [id, status]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotificationNotFoundError(id);
    }

    return mapRow(row);
  }

  async markRead(id: string, client?: PoolClient): Promise<Notification> {
    const conn: Pool | PoolClient = client ?? pool;

    const result = await conn.query<NotificationRow>(
      `UPDATE notifications SET status = $2, read_at = $3 WHERE id = $1 RETURNING ${NOTIFICATION_COLUMNS}`,
      [id, NotificationStatus.READ, new Date()]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotificationNotFoundError(id);
    }

    return mapRow(row);
  }
}
