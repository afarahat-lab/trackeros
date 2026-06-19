import { NotificationService } from '../../../../src/modules/notification/notification.service';
import { INotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { IAuditLogger } from '../../../../src/shared/audit/audit-logger.interface';
import {
  Notification,
  CreateNotificationDto,
  NotificationChannel,
  NotificationStatus,
} from '../../../../src/modules/notification/notification.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepository: jest.Mocked<INotificationRepository>;
  let mockAuditLogger: jest.Mocked<IAuditLogger>;

  const sampleNotification: Notification = {
    id: 'notif-1',
    recipientId: 'user-1',
    channel: NotificationChannel.Email,
    subject: 'Leave Approved',
    body: 'Your leave has been approved.',
    status: NotificationStatus.Pending,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
  };

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      updateStatus: jest.fn(),
      findByRecipient: jest.fn(),
    } as unknown as jest.Mocked<INotificationRepository>;

    mockAuditLogger = {
      log: jest.fn(),
    } as unknown as jest.Mocked<IAuditLogger>;

    service = new NotificationService(mockRepository, mockAuditLogger);
  });

  describe('createNotification', () => {
    it('should create a notification with pending status and log audit', async () => {
      const dto: CreateNotificationDto = {
        recipientId: 'user-1',
        channel: NotificationChannel.Email,
        subject: 'Leave Approved',
        body: 'Your leave has been approved.',
      };

      mockRepository.create.mockResolvedValue(sampleNotification);

      const result = await service.createNotification(dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dto,
        status: NotificationStatus.Pending,
      });
      expect(mockAuditLogger.log).toHaveBeenCalledWith({
        action: 'NOTIFICATION_CREATED',
        resource: 'notification',
        resourceId: sampleNotification.id,
        details: { channel: dto.channel, recipientId: dto.recipientId },
      });
      expect(result).toEqual(sampleNotification);
    });
  });

  describe('markAsSent', () => {
    it('should update status to sent and log audit', async () => {
      const sentNotification: Notification = {
        ...sampleNotification,
        status: NotificationStatus.Sent,
        updatedAt: new Date('2026-01-01T11:00:00Z'),
      };

      mockRepository.updateStatus.mockResolvedValue(sentNotification);

      const result = await service.markAsSent(sampleNotification.id);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        sampleNotification.id,
        NotificationStatus.Sent,
      );
      expect(mockAuditLogger.log).toHaveBeenCalledWith({
        action: 'NOTIFICATION_SENT',
        resource: 'notification',
        resourceId: sampleNotification.id,
        details: { previousStatus: NotificationStatus.Pending },
      });
      expect(result).toEqual(sentNotification);
    });
  });

  describe('markAsFailed', () => {
    it('should update status to failed and log audit', async () => {
      const failedNotification: Notification = {
        ...sampleNotification,
        status: NotificationStatus.Failed,
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      };

      mockRepository.updateStatus.mockResolvedValue(failedNotification);

      const result = await service.markAsFailed(sampleNotification.id);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        sampleNotification.id,
        NotificationStatus.Failed,
      );
      expect(mockAuditLogger.log).toHaveBeenCalledWith({
        action: 'NOTIFICATION_FAILED',
        resource: 'notification',
        resourceId: sampleNotification.id,
        details: { previousStatus: NotificationStatus.Pending },
      });
      expect(result).toEqual(failedNotification);
    });
  });

  describe('getNotificationsForRecipient', () => {
    it('should return notifications for a given recipient', async () => {
      const notifications: Notification[] = [sampleNotification];
      mockRepository.findByRecipient.mockResolvedValue(notifications);

      const result = await service.getNotificationsForRecipient('user-1');

      expect(mockRepository.findByRecipient).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(notifications);
    });
  });
});
