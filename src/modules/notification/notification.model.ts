import { NotificationStatus } from '../../shared/types';

/**
 * Represents a domain event notification triggered by leave lifecycle transitions.
 * Sent to employees (status updates on their requests) and managers (new requests to approve).
 * Also triggered when balance crosses thresholds.
 *
 * Invariants (enforced at the service layer in later phases):
 * - Lifecycle: PENDING → SENT → READ → ARCHIVED.
 * - The `status` field must always hold a valid `NotificationStatus` enum value.
 * - The `readAt` field must be `null` when status is PENDING or SENT.
 * - The `readAt` field must be a non-null `Date` when status is READ or ARCHIVED.
 * - The `type` field must be one of: 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'BALANCE_LOW', 'BALANCE_EXHAUSTED'.
 * - The `leaveRequestId` is a string reference to a LeaveRequest.id — referential integrity is enforced at the service/DB layer in later phases.
 */
export interface LeaveNotification {
  id: string;
  recipientId: string;
  type: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'BALANCE_LOW' | 'BALANCE_EXHAUSTED';
  title: string;
  message: string;
  leaveRequestId: string;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
}
