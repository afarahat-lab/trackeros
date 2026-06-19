export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  type: 'leave_request' | 'leave_approval' | 'leave_rejection' | 'balance_update' | 'policy_change';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface CreateNotificationDto {
  recipientId: string;
  senderId?: string;
  type: 'leave_request' | 'leave_approval' | 'leave_rejection' | 'balance_update' | 'policy_change';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationDto {
  isRead?: boolean;
  readAt?: Date;
}

export interface INotificationRepository {
  create(dto: CreateNotificationDto): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  update(id: string, dto: UpdateNotificationDto): Promise<Notification | null>;
  findUnreadByRecipient(recipientId: string): Promise<Notification[]>;
}
