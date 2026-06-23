import { Pool, PoolClient } from 'pg';
import { BaseRepository } from '../../shared/base-repository';
import { Notification, CreateNotificationDto, NotificationStatus } from './notification.model';

export interface INotificationRepository extends BaseRepository<Notification> {
  findByRecipient(recipientId: string, options?: { status?: string; limit?: number; offset?: number }, client?: PoolClient): Promise<Notification[]>;
  markAsSent(id: string, client?: PoolClient): Promise<void>;
  markAsRead(id: string, client?: PoolClient): Promise<void>;
  countUnread(recipientId: string, client?: PoolClient): Promise<number>;
}

export class PgNotificationRepository extends BaseRepository<Notification> implements INotificationRepository {
  protected tableName = 'notifications';

  constructor(pool: Pool) {
    super(pool);
  }

  async findById(id: string, client?: PoolClient): Promise<Notification | null> {
    const res = await (client || this.pool).query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  async findAll(filters?: Record<string, any>, client?: PoolClient): Promise<Notification[]> {
    const res = await (client || this.pool).query(`SELECT * FROM ${this.tableName}`);
    return res.rows;
  }

  async create(entity: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>, client?: PoolClient): Promise<Notification> {
    const { recipientId, type, title, message, relatedEntityType, relatedEntityId, status, readAt } = entity as any;
    const res = await (client || this.pool).query(
      `INSERT INTO ${this.tableName} (recipient_id, type, title, message, related_entity_type, related_entity_id, status, read_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [recipientId, type, title, message, relatedEntityType, relatedEntityId, status, readAt]
    );
    return res.rows[0];
  }

  async update(id: string, updates: Partial<Notification>, client?: PoolClient): Promise<Notification> {
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, index) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      return `${snakeKey} = $${index + 1}`;
    }).join(', ');
    
    const res = await (client || this.pool).query(
      `UPDATE ${this.tableName} SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return res.rows[0];
  }

  async delete(id: string, client?: PoolClient): Promise<void> {
    await (client || this.pool).query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  async findByRecipient(recipientId: string, options?: { status?: string; limit?: number; offset?: number }, client?: PoolClient): Promise<Notification[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE recipient_id = $1`;
    const params: any[] = [recipientId];
    let paramIndex = 2;
    
    if (options?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(options.status);
    }
    query += ` ORDER BY created_at DESC`;
    
    if (options?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }
    if (options?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }
    
    const res = await (client || this.pool).query(query, params);
    return res.rows;
  }

  async markAsSent(id: string, client?: PoolClient): Promise<void> {
    await (client || this.pool).query(
      `UPDATE ${this.tableName} SET status = $1, updated_at = NOW() WHERE id = $2`,
      [NotificationStatus.SENT, id]
    );
  }

  async markAsRead(id: string, client?: PoolClient): Promise<void> {
    await (client || this.pool).query(
      `UPDATE ${this.tableName} SET status = $1, read_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [NotificationStatus.READ, id]
    );
  }

  async countUnread(recipientId: string, client?: PoolClient): Promise<number> {
    const res = await (client || this.pool).query(
      `SELECT COUNT(*) FROM ${this.tableName} WHERE recipient_id = $1 AND status != $2`,
      [recipientId, NotificationStatus.READ]
    );
    return parseInt(res.rows[0].count, 10);
  }
}
