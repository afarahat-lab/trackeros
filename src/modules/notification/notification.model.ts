import type { BaseEntity } from '../../shared/types/base-entity.interface';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface Notification extends BaseEntity {
  recipientId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: Date | null;
  status: NotificationStatus;
}
