import { Pool } from 'pg';
import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { AuditLogger } from '../../../../src/shared/audit/audit.logger';
import { CreateNotificationDto, UpdateNotificationDto } from '../../../../src/modules/notification/notification.model';

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let mockPool: jest.Mocked<Pool>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;

  beforeEach(() => {
    mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    mockAuditLogger = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditLogger>;

    repository = new NotificationRepository(mockPool, mockAuditLogger);
  });

  describe('create', () => {
    it('should insert a notification and return it', async () => {
      const dto: CreateNotificationDto = {
        recipientId: 'user-1',
        senderId: 'user-2',
        type: 'leave_request',
        title: 'Leave Request',
        message: 'You have a new leave request',
        metadata: { leaveId: 'leave-1' },
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      const expectedNotification = {
        id: 'notif-1',
        recipientId: 'user-1',
        senderId: 'user-2',
        type: 'leave_request',
        title: 'Leave Request',
        message: 'You have a new leave request',
        metadata: { leaveId: 'leave-1' },
        isRead: false,
        readAt: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
      };

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [expectedNotification] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repository.create(dto);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO notifications'), expect.any(Array));
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockAuditLogger.log).toHaveBeenCalledWith('notification.created', {
        entityType: 'notification',
        entityId: 'notif-1',
        recipientId: 'user-1',
        type: 'leave_request',
      });
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(expectedNotification);
    });

    it('should rollback and throw on error', async () => {
      const dto: CreateNotificationDto = {
        recipientId: 'user-1',
        type: 'leave_request',
        title: 'Leave Request',
        message: 'You have a new leave request',
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // INSERT fails

      await expect(repository.create(dto)).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO notifications'), expect.any(Array));
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a notification when found', async () => {
      const expectedNotification = {
        id: 'notif-1',
        recipientId: 'user-1',
        senderId: null,
        type: 'leave_request',
        title: 'Leave Request',
        message: 'You have a new leave request',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [expectedNotification] });

      const result = await repository.findById('notif-1');

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['notif-1']);
      expect(result).toEqual(expectedNotification);
    });

    it('should return null when not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('notif-1');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a notification and return it', async () => {
      const dto: UpdateNotificationDto = {
        isRead: true,
        readAt: new Date('2025-01-02T00:00:00Z'),
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      const expectedNotification = {
        id: 'notif-1',
        recipientId: 'user-1',
        senderId: null,
        type: 'leave_request',
        title: 'Leave Request',
        message: 'You have a new leave request',
        metadata: null,
        isRead: true,
        readAt: new Date('2025-01-02T00:00:00Z'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
      };

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [expectedNotification] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repository.update('notif-1', dto);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE notifications'), expect.any(Array));
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockAuditLogger.log).toHaveBeenCalledWith('notification.updated', {
        entityType: 'notification',
        entityId: 'notif-1',
        changes: dto,
      });
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(expectedNotification);
    });

    it('should return null when notification not found', async () => {
      const dto: UpdateNotificationDto = { isRead: true };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns nothing
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const result = await repository.update('notif-1', dto);

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE notifications'), expect.any(Array));
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when no fields to update', async () => {
      const result = await repository.update('notif-1', {});

      expect(result).toBeNull();
    });

    it('should rollback and throw on error', async () => {
      const dto: UpdateNotificationDto = { isRead: true };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // UPDATE fails

      await expect(repository.update('notif-1', dto)).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE notifications'), expect.any(Array));
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findUnreadByRecipient', () => {
    it('should return unread notifications for a recipient', async () => {
      const expectedNotifications = [
        {
          id: 'notif-1',
          recipientId: 'user-1',
          senderId: null,
          type: 'leave_request',
          title: 'Leave Request',
          message: 'You have a new leave request',
          metadata: null,
          isRead: false,
          readAt: null,
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: expectedNotifications });

      const result = await repository.findUnreadByRecipient('user-1');

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['user-1']);
      expect(result).toEqual(expectedNotifications);
    });

    it('should return empty array when no unread notifications', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.findUnreadByRecipient('user-1');

      expect(result).toEqual([]);
    });
  });
});
