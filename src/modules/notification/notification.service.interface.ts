import { Notification } from "../../shared/types/index";

export interface INotificationService {
  createNotification(employeeId: string, message: string, leaveRequestId?: string): Promise<Notification>;
  getNotification(id: string): Promise<Notification | null>;
  getEmployeeNotifications(employeeId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAsSent(id: string, sentAt?: Date): Promise<void>;
}
