import { INotificationService } from "./notification.service.interface";
import { INotificationRepository } from "./notification.repository.interface";
import { Notification, AppError } from "../../shared/types/index";

export class NotificationService implements INotificationService {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async createNotification(employeeId: string, message: string, leaveRequestId?: string): Promise<Notification> {
    try {
      return await this.notificationRepository.create({ employeeId, leaveRequestId, message });
    } catch (error) {
      throw new AppError(`Failed to create notification: ${(error as Error).message}`, 500);
    }
  }

  async getNotification(id: string): Promise<Notification | null> {
    try {
      return await this.notificationRepository.findById(id);
    } catch (error) {
      throw new AppError(`Failed to get notification: ${(error as Error).message}`, 500);
    }
  }

  async getEmployeeNotifications(employeeId: string): Promise<Notification[]> {
    try {
      return await this.notificationRepository.findByEmployeeId(employeeId);
    } catch (error) {
      throw new AppError(`Failed to get employee notifications: ${(error as Error).message}`, 500);
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      await this.notificationRepository.markAsRead(id, new Date());
    } catch (error) {
      throw new AppError(`Failed to mark notification as read: ${(error as Error).message}`, 500);
    }
  }

  async markAsSent(id: string, sentAt?: Date): Promise<void> {
    try {
      await this.notificationRepository.markAsSent(id, sentAt || new Date());
    } catch (error) {
      throw new AppError(`Failed to mark notification as sent: ${(error as Error).message}`, 500);
    }
  }
}
