import { Notification } from "../../shared/types/index";

export interface CreateNotificationDTO {
  employeeId: string;
  leaveRequestId?: string;
  message: string;
}

export interface INotificationRepository {
  create(notification: CreateNotificationDTO): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByEmployeeId(employeeId: string): Promise<Notification[]>;
  markAsRead(id: string, readAt: Date): Promise<void>;
  markAsSent(id: string, sentAt: Date): Promise<void>;
}
