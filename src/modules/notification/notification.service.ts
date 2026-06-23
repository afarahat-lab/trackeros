import { INotificationRepository } from './notification.repository';
import { IAuditService } from '../audit/audit.service';
import { Notification, CreateNotificationDto, AuditAction, NotificationStatus } from './notification.model';

export interface INotificationService {
  createNotification(dto: CreateNotificationDto): Promise<Notification>;
  sendNotification(id: string): Promise<Notification>;
  getNotificationsForEmployee(employeeId: string, options?: { status?: string; limit?: number; offset?: number }): Promise<Notification[]>;
  markAsRead(notificationId: string, employeeId: string): Promise<Notification>;
  getNotification(id: string): Promise<Notification>;
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly auditService: IAuditService
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const input = {
      recipientId: dto.recipientId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      relatedEntityType: dto.relatedEntityType ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
      status: NotificationStatus.PENDING,
      readAt: null
    };
    const notification = await this.notificationRepository.create(input);
    await this.auditService.recordAction('Notification', notification.id, AuditAction.CREATE, null, { newValues: notification });
    return notification;
  }

  async sendNotification(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) throw new Error('Notification not found');
    
    await this.notificationRepository.markAsSent(id);
    const updated = await this.notificationRepository.findById(id);
    
    await this.auditService.recordAction('Notification', id, AuditAction.UPDATE, null, { 
      oldValues: notification, 
      newValues: updated 
    });
    return updated!;
  }

  async getNotificationsForEmployee(employeeId: string, options?: { status?: string; limit?: number; offset?: number }): Promise<Notification[]> {
    return this.notificationRepository.findByRecipient(employeeId, options);
  }

  async markAsRead(notificationId: string, employeeId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) throw new Error('Notification not found');
    if (notification.recipientId !== employeeId) throw new Error('Unauthorized');
    
    await this.notificationRepository.markAsRead(notificationId);
    const updated = await this.notificationRepository.findById(notificationId);
    
    await this.auditService.recordAction('Notification', notificationId, AuditAction.UPDATE, employeeId, { 
      oldValues: notification, 
      newValues: updated 
    });
    return updated!;
  }

  async getNotification(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) throw new Error('Notification not found');
    return notification;
  }
}
