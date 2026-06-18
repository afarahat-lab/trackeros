export type NotificationType = 'leave_submitted' | 'leave_approved' | 'leave_rejected' | 'leave_cancelled' | 'balance_low' | 'balance_expiring';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, any> | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}
