import { Notification, CreateNotificationDto } from './notification.model';

export interface INotificationRepository {
  create(dto: CreateNotificationDto): Promise<Notification>;
  findByRecipientId(recipientId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification>;
}

export class PgNotificationRepository implements INotificationRepository {
  constructor(private readonly pool: import('pg').Pool) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    // Implementation using PostgreSQL pool
    throw new Error('Not implemented');
  }

  async findByRecipientId(recipientId: string): Promise<Notification[]> {
    throw new Error('Not implemented');
  }

  async markAsRead(id: string): Promise<Notification> {
    throw new Error('Not implemented');
  }
}
