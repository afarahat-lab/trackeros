export interface Notification {
  id: string;
  recipientId: string;
  type: 'LEAVE_SUBMITTED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED';
  title: string;
  message: string;
  relatedEntityType: 'LeaveRequest';
  relatedEntityId: string;
  status: 'PENDING' | 'SENT' | 'READ' | 'ARCHIVED';
  createdAt: Date;
  readAt: Date | null;
}
