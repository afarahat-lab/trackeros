import { PoolClient } from 'pg';
import { NotificationStatus } from '../../shared/types';
import { ValidationError, NotFoundError } from '../../shared/errors';
import { Notification, CreateNotificationInput } from './notification.model';
import { INotificationRepository } from './notification.repository.interface';
import { INotificationService } from './notification.service.interface';

export class NotificationService implements INotificationService {
  constructor(private readonly repository: INotificationRepository) {}

  async create(input: CreateNotificationInput, client?: PoolClient): Promise<Notification> {
    this.validate(input);
    return this.repository.create(
      {
        ...input,
        status: input.status ?? NotificationStatus.PENDING,
      },
      client
    );
  }

  async getById(id: string): Promise<Notification> {
    const notification = await this.repository.findById(id);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    return notification;
  }

  async markRead(id: string): Promise<Notification> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await this.repository.updateStatus(id, NotificationStatus.READ, new Date());
    if (!updated) {
      throw new NotFoundError('Notification not found');
    }
    return updated;
  }

  private validate(input: CreateNotificationInput): void {
    const requiredStrings: Array<[keyof CreateNotificationInput, string]> = [
      ['recipientId', 'recipientId'],
      ['type', 'type'],
      ['title', 'title'],
      ['message', 'message'],
    ];

    for (const [key, label] of requiredStrings) {
      const value = input[key];
      if (typeof value !== 'string' || value.trim() === '') {
        throw new ValidationError(`Invalid ${label}`);
      }
    }

    if (input.status !== undefined && !Object.values(NotificationStatus).includes(input.status)) {
      throw new ValidationError('Invalid status');
    }
  }
}
