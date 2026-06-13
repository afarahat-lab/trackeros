export interface Notification {
  id: string;
  recipientId: string;
  senderId: string | null;
  type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED';
  title: string;
  body: string;
  relatedEntityType: 'LEAVE_REQUEST';
  relatedEntityId: string;
  status: 'CREATED' | 'SENT' | 'READ';
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationDto {
  recipientId: string;
  senderId?: string;
  type: Notification['type'];
  title: string;
  body: string;
  relatedEntityType: Notification['relatedEntityType'];
  relatedEntityId: string;
}
