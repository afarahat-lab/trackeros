import { INotificationRepository } from './notification.repository';
import { IAuditLogger } from '../../shared/audit/audit-logger.interface';
import {
  Notification,
  CreateNotificationDto,
  NotificationStatus,
} from './notification.model';

export interface INotificationService {
  createNotification(dto: CreateNotificationDto): Promise<Notification>;
  markAsSent(notificationId: string): Promise<Notification>;
  markAsFailed(notificationId: string): Promise<Notification>;
  getNotificationsForRecipient(recipientId: string): Promise<Notification[]>;
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.notificationRepository.create({
      ...dto,
      status: NotificationStatus.Pending,
    });

    await this.auditLogger.log({
      action: 'NOTIFICATION_CREATED',
      resource: 'notification',
      resourceId: notification.id,
      details: { channel: dto.channel, recipientId: dto.recipientId },
    });

    return notification;
  }

  async markAsSent(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.updateStatus(
      notificationId,
      NotificationStatus.Sent,
    );

    await this.auditLogger.log({
      action: 'NOTIFICATION_SENT',
      resource: 'notification',
      resourceId: notificationId,
      details: { previousStatus: NotificationStatus.Pending },
    });

    return notification;
  }

  async markAsFailed(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.updateStatus(
      notificationId,
      NotificationStatus.Failed,
    );

    await this.auditLogger.log({
      action: 'NOTIFICATION_FAILED',
      resource: 'notification',
      resourceId: notificationId,
      details: { previousStatus: NotificationStatus.Pending },
    });

    return notification;
  }

  async getNotificationsForRecipient(
    recipientId: string,
  ): Promise<Notification[]> {
    return this.notificationRepository.findByRecipient(recipientId);
  }
}
