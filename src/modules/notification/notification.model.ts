export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType: string;
  relatedEntityId: string;
  status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationDto {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType: string;
  relatedEntityId: string;
}

export interface UpdateNotificationDto {
  status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';
}
