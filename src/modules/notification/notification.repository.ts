import { Pool } from '../../shared/db/connection';
import { Notification, CreateNotificationDto, NotificationStatus } from './notification.model';

export interface INotificationRepository {
  create(dto: CreateNotificationDto): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  updateStatus(id: string, status: NotificationStatus): Promise<Notification>;
}

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly pool: Pool) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    throw new Error('Not implemented');
  }

  async findById(id: string): Promise<Notification | null> {
    throw new Error('Not implemented');
  }

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    throw new Error('Not implemented');
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<Notification> {
    throw new Error('Not implemented');
  }
}
