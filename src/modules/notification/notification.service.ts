import { INotificationRepository } from './notification.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { Notification } from './notification.model';

export interface INotificationService {
  sendLeaveRequestNotification(
    recipientId: string,
    leaveRequestId: string,
    notificationType: 'leave_request' | 'leave_approval' | 'leave_rejection',
    metadata?: Record<string, any>
  ): Promise<void>;
  
  sendBalanceUpdateNotification(
    recipientId: string,
    balanceId: string,
    metadata?: Record<string, any>
  ): Promise<void>;
  
  markAsRead(notificationId: string): Promise<void>;
  
  getUnreadNotifications(recipientId: string): Promise<Notification[]>;
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly auditLogger: AuditLogger
  ) {}

  async sendLeaveRequestNotification(
    recipientId: string,
    leaveRequestId: string,
    notificationType: 'leave_request' | 'leave_approval' | 'leave_rejection',
    metadata?: Record<string, any>
  ): Promise<void> {
    const title = this.getTitleForLeaveNotification(notificationType);
    const message = this.getMessageForLeaveNotification(notificationType, leaveRequestId);
    
    const notificationData: Omit<Notification, 'id' | 'createdAt'> = {
      recipientId,
      type: notificationType,
      title,
      message,
      metadata: { ...metadata, leaveRequestId },
      isRead: false
    };

    const notification = await this.notificationRepository.create(notificationData);
    
    await this.auditLogger.log('create', {
      entityType: 'notification',
      entityId: notification.id,
      action: 'create',
      oldValues: null,
      newValues: this.sanitizeForLogging(notification)
    });
  }

  async sendBalanceUpdateNotification(
    recipientId: string,
    balanceId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const notificationData: Omit<Notification, 'id' | 'createdAt'> = {
      recipientId,
      type: 'balance_update',
      title: 'Leave Balance Updated',
      message: `Your leave balance (ID: ${balanceId}) has been updated.`,
      metadata: { ...metadata, balanceId },
      isRead: false
    };

    const notification = await this.notificationRepository.create(notificationData);
    
    await this.auditLogger.log('create', {
      entityType: 'notification',
      entityId: notification.id,
      action: 'create',
      oldValues: null,
      newValues: this.sanitizeForLogging(notification)
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    const updatedNotification = await this.notificationRepository.update(notificationId, { 
      isRead: true, 
      readAt: new Date() 
    });
    
    await this.auditLogger.log('update', {
      entityType: 'notification',
      entityId: notificationId,
      action: 'update',
      oldValues: this.sanitizeForLogging(notification),
      newValues: this.sanitizeForLogging(updatedNotification)
    });
  }

  async getUnreadNotifications(recipientId: string): Promise<Notification[]> {
    return this.notificationRepository.findByRecipient(recipientId, { isRead: false });
  }

  private getTitleForLeaveNotification(type: 'leave_request' | 'leave_approval' | 'leave_rejection'): string {
    switch (type) {
      case 'leave_request': return 'New Leave Request';
      case 'leave_approval': return 'Leave Request Approved';
      case 'leave_rejection': return 'Leave Request Rejected';
      default: return 'Leave Notification';
    }
  }

  private getMessageForLeaveNotification(type: 'leave_request' | 'leave_approval' | 'leave_rejection', leaveRequestId: string): string {
    switch (type) {
      case 'leave_request': return `A new leave request (ID: ${leaveRequestId}) requires your attention.`;
      case 'leave_approval': return `Your leave request (ID: ${leaveRequestId}) has been approved.`;
      case 'leave_rejection': return `Your leave request (ID: ${leaveRequestId}) has been rejected.`;
      default: return `Leave request ${leaveRequestId} notification.`;
    }
  }

  private sanitizeForLogging(data: any): any {
    const sanitized = { ...data };
    delete sanitized.metadata?.sensitiveData;
    return sanitized;
  }
}
