import { NotificationStatus } from '../../shared/types';

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  /**
   * The human/machine code of the related entity (for a leave request, its leave
   * type code). Generic — a code for whatever `relatedEntityType` names — and
   * nullable: a notification unrelated to a coded entity carries none.
   */
  relatedEntityCode: string | null;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}

export type CreateNotificationInput = Omit<
  Notification,
  'id' | 'status' | 'createdAt' | 'readAt' | 'relatedEntityCode'
> & {
  status?: NotificationStatus;
  /** Optional at the call site; the repository persists `null` when omitted. */
  relatedEntityCode?: string | null;
};
