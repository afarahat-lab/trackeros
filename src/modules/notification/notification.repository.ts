import { LeaveNotification } from './notification.model';
import { NotificationStatus } from '../../shared/types';

/**
 * Repository interface for LeaveNotification entity.
 * All database access goes through this interface (GP-001).
 * The real DB-backed implementation comes in a later phase.
 */
export interface INotificationRepository {
  findById(id: string): Promise<LeaveNotification | null>;
  findByRecipientId(recipientId: string): Promise<LeaveNotification[]>;
  findByLeaveRequestId(leaveRequestId: string): Promise<LeaveNotification[]>;
  create(notification: Omit<LeaveNotification, 'id' | 'createdAt'>): Promise<LeaveNotification>;
  updateStatus(id: string, status: NotificationStatus): Promise<LeaveNotification | null>;
}

/**
 * Stub implementation of INotificationRepository.
 * All methods throw "not implemented" — the real DB-backed
 * implementation is provided in a later phase.
 */
export class NotificationRepository implements INotificationRepository {
  async findById(_id: string): Promise<LeaveNotification | null> {
    throw new Error('not implemented');
  }

  async findByRecipientId(_recipientId: string): Promise<LeaveNotification[]> {
    throw new Error('not implemented');
  }

  async findByLeaveRequestId(_leaveRequestId: string): Promise<LeaveNotification[]> {
    throw new Error('not implemented');
  }

  async create(_notification: Omit<LeaveNotification, 'id' | 'createdAt'>): Promise<LeaveNotification> {
    throw new Error('not implemented');
  }

  async updateStatus(_id: string, _status: NotificationStatus): Promise<LeaveNotification | null> {
    throw new Error('not implemented');
  }
}
