import { Pool } from '../../shared/db/connection';
import { Notification, CreateNotificationDto, NotificationStatus, NotificationType } from './notification.model';

export interface INotificationRepository {
  create(dto: CreateNotificationDto): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  updateStatus(id: string, status: NotificationStatus): Promise<Notification>;
}

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly pool: Pool) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const result = await this.pool.query(
      `INSERT INTO notifications (recipient_id, message, type, status, read, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [dto.recipientId, dto.message, dto.type, NotificationStatus.PENDING, false]
    );
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<Notification | null> {
    const result = await this.pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    const result = await this.pool.query(
      'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC',
      [recipientId]
    );
    return result.rows.map(this.mapRow);
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<Notification> {
    const result = await this.pool.query(
      `UPDATE notifications 
       SET status = $1, 
           read = CASE WHEN $1 = 'read' THEN true ELSE read END 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );
    if (!result.rows[0]) {
      throw new Error(`Notification with id ${id} not found`);
    }
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: any): Notification {
    return {
      id: row.id,
      recipientId: row.recipient_id,
      message: row.message,
      type: row.type as NotificationType,
      status: row.status as NotificationStatus,
      read: row.read,
      createdAt: row.created_at,
    };
  }
}
