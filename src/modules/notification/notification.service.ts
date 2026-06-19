import {
  Notification,
  CreateNotificationDto,
  NotificationStatus,
} from './notification.model';

export interface INotificationRepository {
  create(data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  updateStatus(id: string, status: NotificationStatus): Promise<Notification>;
}

export interface IAuditLogger {
  log(event: string, message: string): void;
}

export interface INotificationService {
  sendNotification(dto: CreateNotificationDto): Promise<Notification>;
  getNotificationById(id: string): Promise<Notification | null>;
  getNotificationsForRecipient(recipientId: string): Promise<Notification[]>;
  markAsSent(id: string): Promise<Notification>;
  markAsFailed(id: string): Promise<Notification>;
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async sendNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.notificationRepository.create({
      ...dto,
      status: NotificationStatus.Pending,
    });

    this.auditLogger.log(
      'NOTIFICATION_CREATED',
      `Notification ${notification.id} created for recipient ${notification.recipientId}`,
    );

    // In a real implementation, we would dispatch to a message queue or
    // external service here. For now, we just mark as sent.
    const sent = await this.notificationRepository.updateStatus(
      notification.id,
      NotificationStatus.Sent,
    );

    this.auditLogger.log(
      'NOTIFICATION_SENT',
      `Notification ${sent.id} sent to ${sent.recipientId}`,
    );

    return sent;
  }

  async getNotificationById(id: string): Promise<Notification | null> {
    return this.notificationRepository.findById(id);
  }

  async getNotificationsForRecipient(
    recipientId: string,
  ): Promise<Notification[]> {
    return this.notificationRepository.findByRecipient(recipientId);
  }

  async markAsSent(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.updateStatus(
      id,
      NotificationStatus.Sent,
    );

    this.auditLogger.log(
      'NOTIFICATION_MARKED_SENT',
      `Notification ${notification.id} marked as sent`,
    );

    return notification;
  }

  async markAsFailed(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.updateStatus(
      id,
      NotificationStatus.Failed,
    );

    this.auditLogger.log(
      'NOTIFICATION_MARKED_FAILED',
      `Notification ${notification.id} marked as failed`,
    );

    return notification;
  }
}
