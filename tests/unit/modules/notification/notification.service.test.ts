import {
  NotificationService,
  INotificationRepository,
  IAuditLogger,
} from '../../../../src/modules/notification/notification.service';
import {
  Notification,
  CreateNotificationDto,
  NotificationChannel,
  NotificationStatus,
} from '../../../../src/modules/notification/notification.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepo: jest.Mocked<INotificationRepository>;
  let mockAuditLogger: jest.Mocked<IAuditLogger>;

  const sampleNotification: Notification = {
    id: 'notif-1',
    recipientId: 'user-123',
    channel: NotificationChannel.Email,
    subject: 'Leave Approved',
    body: 'Your leave has been approved.',
    status: NotificationStatus.Pending,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
  };

  const createDto: CreateNotificationDto = {
    recipientId: 'user-123',
    channel: NotificationChannel.Email,
    subject: 'Leave Approved',
    body: 'Your leave has been approved.',
  };

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByRecipient: jest.fn(),
      updateStatus: jest.fn(),
    } as any;

    mockAuditLogger = {
      log: jest.fn(),
    } as any;

    service = new NotificationService(mockRepo, mockAuditLogger);
  });

  describe('sendNotification', () => {
    it('should create a notification with pending status and then mark as sent', async () => {
      const createdPending: Notification = {
        ...sampleNotification,
        status: NotificationStatus.Pending,
      };
      const sentNotification: Notification = {
        ...sampleNotification,
        status: NotificationStatus.Sent,
      };

      mockRepo.create.mockResolvedValue(createdPending);
      mockRepo.updateStatus.mockResolvedValue(sentNotification);

      const result = await service.sendNotification(createDto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        ...createDto,
        status: NotificationStatus.Pending,
      });
      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        createdPending.id,
        NotificationStatus.Sent,
      );
      expect(mockAuditLogger.log).toHaveBeenCalledTimes(2);
      expect(mockAuditLogger.log).toHaveBeenNthCalledWith(
        1,
        'NOTIFICATION_CREATED',
        expect.stringContaining(createdPending.id),
      );
      expect(mockAuditLogger.log).toHaveBeenNthCalledWith(
        2,
        'NOTIFICATION_SENT',
        expect.stringContaining(sentNotification.id),
      );
      expect(result).toEqual(sentNotification);
    });

    it('should propagate errors from repository create', async () => {
      const error = new Error('DB error');
      mockRepo.create.mockRejectedValue(error);

      await expect(service.sendNotification(createDto)).rejects.toThrow(error);
      expect(mockAuditLogger.log).not.toHaveBeenCalled();
    });

    it('should propagate errors from repository updateStatus', async () => {
      const createdPending: Notification = {
        ...sampleNotification,
        status: NotificationStatus.Pending,
      };
      mockRepo.create.mockResolvedValue(createdPending);
      const error = new Error('Update failed');
      mockRepo.updateStatus.mockRejectedValue(error);

      await expect(service.sendNotification(createDto)).rejects.toThrow(error);
      expect(mockAuditLogger.log).toHaveBeenCalledTimes(1); // only creation logged
    });
  });

  describe('getNotificationById', () => {
    it('should return notification when found', async () => {
      mockRepo.findById.mockResolvedValue(sampleNotification);

      const result = await service.getNotificationById('notif-1');

      expect(mockRepo.findById).toHaveBeenCalledWith('notif-1');
      expect(result).toEqual(sampleNotification);
    });

    it('should return null when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.getNotificationById('missing');

      expect(mockRepo.findById).toHaveBeenCalledWith('missing');
      expect(result).toBeNull();
    });
  });

  describe('getNotificationsForRecipient', () => {
    it('should return notifications for a given recipient', async () => {
      const notifications: Notification[] = [sampleNotification];
      mockRepo.findByRecipient.mockResolvedValue(notifications);

      const result = await service.getNotificationsForRecipient('user-123');

      expect(mockRepo.findByRecipient).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(notifications);
    });

    it('should return empty array when no notifications exist', async () => {
      mockRepo.findByRecipient.mockResolvedValue([]);

      const result = await service.getNotificationsForRecipient('user-999');

      expect(result).toEqual([]);
    });
  });

  describe('markAsSent', () => {
    it('should update status to sent and log', async () => {
      const sentNotification: Notification = {
        ...sampleNotification,
        status: NotificationStatus.Sent,
      };
      mockRepo.updateStatus.mockResolvedValue(sentNotification);

      const result = await service.markAsSent('notif-1');

      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        'notif-1',
        NotificationStatus.Sent,
      );
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'NOTIFICATION_MARKED_SENT',
        expect.stringContaining('notif-1'),
      );
      expect(result).toEqual(sentNotification);
    });
  });

  describe('markAsFailed', () => {
    it('should update status to failed and log', async () => {
      const failedNotification: Notification = {
        ...sampleNotification,
        status: NotificationStatus.Failed,
      };
      mockRepo.updateStatus.mockResolvedValue(failedNotification);

      const result = await service.markAsFailed('notif-1');

      expect(mockRepo.updateStatus).toHaveBeenCalledWith(
        'notif-1',
        NotificationStatus.Failed,
      );
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        'NOTIFICATION_MARKED_FAILED',
        expect.stringContaining('notif-1'),
      );
      expect(result).toEqual(failedNotification);
    });
  });
});
