export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';
  createdAt: Date;
  readAt: Date | null;
}

export interface CreateNotificationDto {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  status?: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';
}
