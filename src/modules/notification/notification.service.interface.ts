import { Notification } from '../../shared/types';

export interface INotificationService {
  sendNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'sentAt'>): Promise<Notification>;
  markAsRead(notificationId: string): Promise<void>;
  getNotifications(employeeId: string): Promise<Notification[]>;
}
