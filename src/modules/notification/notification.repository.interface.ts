import { Notification } from './notification.model';

export interface CreateNotificationDto {
  recipientId: string;
  type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED';
  title: string;
  message: string;
  relatedEntityType: 'LeaveRequest';
  relatedEntityId: string;
}

export interface INotificationRepository {
  create(dto: CreateNotificationDto): Promise<Notification>;
  findByRecipient(recipientId: string): Promise<Notification[]>;
  markAsSent(id: string): Promise<Notification | null>;
  markAsRead(id: string): Promise<Notification | null>;
  createBatch(dtos: CreateNotificationDto[]): Promise<Notification[]>;
}
