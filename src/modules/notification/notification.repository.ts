import { Pool } from "pg";
import { INotificationRepository, CreateNotificationDTO } from "./notification.repository.interface";
import { Notification } from "../../shared/types/index";

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly pool: Pool) {}

  async create(notification: CreateNotificationDTO): Promise<Notification> {
    const query = `
      INSERT INTO notifications (employee_id, leave_request_id, message)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [notification.employeeId, notification.leaveRequestId || null, notification.message];
    const result = await this.pool.query(query, values);
    return this.mapRowToNotification(result.rows[0]);
  }

  async findById(id: string): Promise<Notification | null> {
    const query = `SELECT * FROM notifications WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? this.mapRowToNotification(result.rows[0]) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<Notification[]> {
    const query = `SELECT * FROM notifications WHERE employee_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [employeeId]);
    return result.rows.map(this.mapRowToNotification);
  }

  async markAsRead(id: string, readAt: Date): Promise<void> {
    const query = `UPDATE notifications SET read_at = $1 WHERE id = $2`;
    await this.pool.query(query, [readAt, id]);
  }

  async markAsSent(id: string, sentAt: Date): Promise<void> {
    const query = `UPDATE notifications SET sent_at = $1 WHERE id = $2`;
    await this.pool.query(query, [sentAt, id]);
  }

  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      employeeId: row.employee_id,
      message: row.message,
      createdAt: row.created_at,
      sentAt: row.sent_at,
      readAt: row.read_at,
    };
  }
}
