export interface Notification {
  id: string;
  recipientId: string;
  senderId: string | null;
  type: 'leave_submitted' | 'leave_approved' | 'leave_rejected' | 'balance_low' | 'system_alert';
  title: string;
  message: string;
  metadata: Record<string, any> | null;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
}
