import { NotificationService, INotificationService } from '../../../../src/modules/notification/notification.service';
import { INotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { AuditLogger } from '../../../../src/shared/audit/audit.logger';
import { Notification } from '../../../../src/modules/notification/notification.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepository: jest.Mocked<INotificationRepository>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;

  const sampleNotification: Notification = {
    id: 'notif-1',
    recipientId: 'user-1',
    type: 'leave_request',
    title: 'New Leave Request',
    message: 'A new leave request (ID: leave-1) requires your attention.',
    metadata: { leaveRequestId: 'leave-1' },
    isRead: false,
    createdAt: new Date('2026-01-01T10:00:00Z'),
  };

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findByRecipient: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<INotificationRepository>;

    mockAuditLogger = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditLogger>;

    service = new NotificationService(mockRepository, mockAuditLogger);
  });

  describe('sendLeaveRequestNotification', () => {
    it('should create a leave request notification and log audit', async () => {
      mockRepository.create.mockResolvedValue(sampleNotification);

      await service.sendLeaveRequestNotification('user-1', 'leave-1', 'leave_request', { priority: 'high' });

      expect(mockRepository.create).toHaveBeenCalledWith({
        recipientId: 'user-1',
        type: 'leave_request',
        title: 'New Leave Request',
        message: 'A new leave request (ID: leave-1) requires your attention.',
        metadata: { priority: 'high', leaveRequestId: 'leave-1' },
        isRead: false,
      });

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'create',
        expect.objectContaining({
          entityType: 'notification',
          entityId: sampleNotification.id,
          action: 'create',
          oldValues: null,
          newValues: expect.objectContaining({
            id: sampleNotification.id,
            recipientId: 'user-1',
            type: 'leave_request',
          }),
        })
      );
    });

    it('should handle leave_approval notification type', async () => {
      const approvalNotification: Notification = {
        ...sampleNotification,
        type: 'leave_approval',
        title: 'Leave Request Approved',
        message: 'Your leave request (ID: leave-1) has been approved.',
      };
      mockRepository.create.mockResolvedValue(approvalNotification);

      await service.sendLeaveRequestNotification('user-1', 'leave-1', 'leave_approval');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'leave_approval',
          title: 'Leave Request Approved',
          message: 'Your leave request (ID: leave-1) has been approved.',
        })
      );
    });

    it('should handle leave_rejection notification type', async () => {
      const rejectionNotification: Notification = {
        ...sampleNotification,
        type: 'leave_rejection',
        title: 'Leave Request Rejected',
        message: 'Your leave request (ID: leave-1) has been rejected.',
      };
      mockRepository.create.mockResolvedValue(rejectionNotification);

      await service.sendLeaveRequestNotification('user-1', 'leave-1', 'leave_rejection');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'leave_rejection',
          title: 'Leave Request Rejected',
          message: 'Your leave request (ID: leave-1) has been rejected.',
        })
      );
    });
  });

  describe('sendBalanceUpdateNotification', () => {
    it('should create a balance update notification and log audit', async () => {
      const balanceNotification: Notification = {
        id: 'notif-2',
        recipientId: 'user-1',
        type: 'balance_update',
        title: 'Leave Balance Updated',
        message: 'Your leave balance (ID: bal-1) has been updated.',
        metadata: { balanceId: 'bal-1' },
        isRead: false,
        createdAt: new Date('2026-01-01T11:00:00Z'),
      };
      mockRepository.create.mockResolvedValue(balanceNotification);

      await service.sendBalanceUpdateNotification('user-1', 'bal-1', { days: 20 });

      expect(mockRepository.create).toHaveBeenCalledWith({
        recipientId: 'user-1',
        type: 'balance_update',
        title: 'Leave Balance Updated',
        message: 'Your leave balance (ID: bal-1) has been updated.',
        metadata: { days: 20, balanceId: 'bal-1' },
        isRead: false,
      });

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'create',
        expect.objectContaining({
          entityType: 'notification',
          entityId: balanceNotification.id,
          action: 'create',
          oldValues: null,
          newValues: expect.objectContaining({
            id: balanceNotification.id,
            recipientId: 'user-1',
            type: 'balance_update',
          }),
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and log audit', async () => {
      const unreadNotification: Notification = { ...sampleNotification, isRead: false };
      const readNotification: Notification = {
        ...sampleNotification,
        isRead: true,
        readAt: new Date('2026-01-01T12:00:00Z'),
      };

      mockRepository.findById.mockResolvedValue(unreadNotification);
      mockRepository.update.mockResolvedValue(readNotification);

      await service.markAsRead('notif-1');

      expect(mockRepository.findById).toHaveBeenCalledWith('notif-1');
      expect(mockRepository.update).toHaveBeenCalledWith('notif-1', {
        isRead: true,
        readAt: expect.any(Date),
      });

      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'update',
        expect.objectContaining({
          entityType: 'notification',
          entityId: 'notif-1',
          action: 'update',
          oldValues: expect.objectContaining({ id: 'notif-1', isRead: false }),
          newValues: expect.objectContaining({ id: 'notif-1', isRead: true }),
        })
      );
    });

    it('should throw error if notification not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent')).rejects.toThrow(
        'Notification with ID nonexistent not found'
      );

      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockAuditLogger.log).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadNotifications', () => {
    it('should return unread notifications for recipient', async () => {
      const unreadNotifications: Notification[] = [sampleNotification];
      mockRepository.findByRecipient.mockResolvedValue(unreadNotifications);

      const result = await service.getUnreadNotifications('user-1');

      expect(mockRepository.findByRecipient).toHaveBeenCalledWith('user-1', { isRead: false });
      expect(result).toEqual(unreadNotifications);
    });

    it('should return empty array when no unread notifications', async () => {
      mockRepository.findByRecipient.mockResolvedValue([]);

      const result = await service.getUnreadNotifications('user-1');

      expect(result).toEqual([]);
    });
  });
});
