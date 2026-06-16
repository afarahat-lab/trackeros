import { Pool } from 'pg';
import { Notification, CreateNotificationDto, UpdateNotificationDto } from './notification.model';

export interface INotificationRepository {
  create(data: CreateNotificationDto): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  updateStatus(id: string, status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED'): Promise<Notification>;
  markAsSent(id: string): Promise<Notification>;
  markAsRead(id: string): Promise<Notification>;
}

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: CreateNotificationDto): Promise<Notification> {
    const query = `
      INSERT INTO notifications (recipientId, type, title, body, relatedEntityType, relatedEntityId)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, recipientId, type, title, body, relatedEntityType, relatedEntityId, status, createdAt, updatedAt
    `;
    const values = [data.recipientId, data.type, data.title, data.body, data.relatedEntityType, data.relatedEntityId];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Notification | null> {
    const query = `SELECT * FROM notifications WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    const query = `SELECT * FROM notifications WHERE recipientId = $1 ORDER BY createdAt DESC`;
    const result = await this.pool.query(query, [recipientId]);
    return result.rows;
  }

  async updateStatus(id: string, status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED'): Promise<Notification> {
    const query = `UPDATE notifications SET status = $1, updatedAt = NOW() WHERE id = $2 RETURNING *`;
    const result = await this.pool.query(query, [status, id]);
    return result.rows[0];
  }

  async markAsSent(id: string): Promise<Notification> {
    return this.updateStatus(id, 'SENT');
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.updateStatus(id, 'READ');
  }
}
