import { NotificationStatus } from '../../../../src/shared/types';
import {
  NotificationRepository,
  INotificationRepository,
  LeaveNotification,
} from '../../../../src/modules/notification';

describe('NotificationRepository (stub)', () => {
  let repository: INotificationRepository;

  const validCreateInput: Omit<LeaveNotification, 'id' | 'createdAt'> = {
    recipientId: 'emp-001',
    type: 'SUBMITTED',
    title: 'Leave Request Submitted',
    message: 'Your leave request has been submitted for approval.',
    leaveRequestId: 'lr-001',
    status: NotificationStatus.PENDING,
    readAt: null,
  };

  beforeEach(() => {
    repository = new NotificationRepository();
  });

  describe('findById', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findById('notif-001')).rejects.toThrow('not implemented');
    });
  });

  describe('findByRecipientId', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findByRecipientId('emp-001')).rejects.toThrow('not implemented');
    });
  });

  describe('findByLeaveRequestId', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findByLeaveRequestId('lr-001')).rejects.toThrow('not implemented');
    });
  });

  describe('create', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.create(validCreateInput)).rejects.toThrow('not implemented');
    });

    it('should accept input without id and createdAt', async () => {
      const input: Omit<LeaveNotification, 'id' | 'createdAt'> = {
        recipientId: 'emp-002',
        type: 'APPROVED',
        title: 'Leave Request Approved',
        message: 'Your leave request has been approved.',
        leaveRequestId: 'lr-002',
        status: NotificationStatus.PENDING,
        readAt: null,
      };

      await expect(repository.create(input)).rejects.toThrow('not implemented');
    });

    it('should accept input with readAt set for READ status', async () => {
      const input: Omit<LeaveNotification, 'id' | 'createdAt'> = {
        recipientId: 'emp-003',
        type: 'BALANCE_LOW',
        title: 'Balance Low',
        message: 'Your leave balance is running low.',
        leaveRequestId: 'lr-003',
        status: NotificationStatus.READ,
        readAt: new Date('2026-08-16T12:00:00Z'),
      };

      await expect(repository.create(input)).rejects.toThrow('not implemented');
    });
  });

  describe('updateStatus', () => {
    it('should throw "not implemented"', async () => {
      await expect(
        repository.updateStatus('notif-001', NotificationStatus.READ),
      ).rejects.toThrow('not implemented');
    });

    it('should accept all valid NotificationStatus transitions', async () => {
      const transitions: NotificationStatus[] = [
        NotificationStatus.SENT,
        NotificationStatus.READ,
        NotificationStatus.ARCHIVED,
      ];

      for (const status of transitions) {
        await expect(repository.updateStatus('notif-001', status)).rejects.toThrow(
          'not implemented',
        );
      }
    });
  });

  describe('interface contract', () => {
    it('should have all required methods', () => {
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByRecipientId).toBe('function');
      expect(typeof repository.findByLeaveRequestId).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.updateStatus).toBe('function');
    });
  });
});
