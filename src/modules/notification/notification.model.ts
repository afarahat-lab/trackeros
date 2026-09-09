import { NotificationStatus } from '../../shared/types';

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}

export type CreateNotificationInput = Omit<Notification, 'id' | 'status' | 'createdAt' | 'readAt'> & {
  status?: NotificationStatus;
};
