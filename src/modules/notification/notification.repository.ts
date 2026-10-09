import { randomUUID } from 'crypto';
import { Pool, PoolClient, QueryResult } from 'pg';
import { pool as defaultPool } from '../../shared/db/connection';
import { NotificationStatus } from '../../shared/types';
import { Notification, CreateNotificationInput } from './notification.model';
import { INotificationRepository } from './notification.repository.interface';

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

const COLUMNS =
  'id, recipient_id, type, title, message, related_entity_type, related_entity_id, status, created_at, read_at';

export class PgNotificationRepository implements INotificationRepository {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  private db(client?: PoolClient): Pool | PoolClient {
    return client ?? this.dbPool;
  }

  async create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification> {
    const id = randomUUID();
    const createdAt = new Date();
    const status = input.status ?? NotificationStatus.PENDING;
    const query = `
      INSERT INTO notifications (
        id, recipient_id, type, title, message, related_entity_type, related_entity_id,
        status, created_at, read_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING ${COLUMNS}
    `;
    const values = [
      id,
      input.recipientId,
      input.type,
      input.title,
      input.message,
      input.relatedEntityType,
      input.relatedEntityId,
      status,
      createdAt,
      null,
    ];
    const result: QueryResult<NotificationRow> = await this.db(client).query(query, values);
    return mapRow(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<Notification | null> {
    const query = `SELECT ${COLUMNS} FROM notifications WHERE id = $1`;
    const result: QueryResult<NotificationRow> = await this.db(client).query(query, [id]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async updateStatus(
    id: string,
    status: Notification['status'],
    readAt: Date | null,
    client?: PoolClient
  ): Promise<Notification | null> {
    const query = `
      UPDATE notifications
      SET status = $2, read_at = $3
      WHERE id = $1
      RETURNING ${COLUMNS}
    `;
    const result: QueryResult<NotificationRow> = await this.db(client).query(query, [
      id,
      status,
      readAt,
    ]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }
}
