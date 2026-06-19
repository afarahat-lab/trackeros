import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { CreateNotificationDto, UpdateNotificationDto } from '../../../../src/modules/notification/notification.model';
import pool from '../../../../src/shared/db/connection';
import { AuditLogger } from '../../../../src/shared/audit/audit.logger';

jest.mock('../../../../src/shared/db/connection');
jest.mock('../../../../src/shared/audit/audit.logger');

const mockPool = pool as jest.Mocked<typeof pool> & {
  connect: jest.Mock;
  query: jest.Mock;
};

const mockAuditLogger = AuditLogger as jest.MockedClass<typeof AuditLogger>;

describe('NotificationRepository', () => {
  let repository: NotificationRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new NotificationRepository();
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

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'notif-1',
              recipientId: 'user-1',
              senderId: 'user-2',
              type: 'leave_request',
              title: 'Leave Request',
              message: 'You have a new leave request',
              metadata: { leaveId: 'leave-1' },
              isRead: false,
              readAt: null,
              createdAt: new Date('2025-01-01'),
            },
          ],
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repository.create(dto);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO notifications'), [
        'user-1',
        'user-2',
        'leave_request',
        'Leave Request',
        'You have a new leave request',
        { leaveId: 'leave-1' },
      ]);
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'notif-1',
        recipientId: 'user-1',
        type: 'leave_request',
      });
    });

    it('should rollback on error', async () => {
      const dto: CreateNotificationDto = {
        recipientId: 'user-1',
        type: 'leave_request',
        title: 'Test',
        message: 'Test',
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error'));

      await expect(repository.create(dto)).rejects.toThrow('DB error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a notification when found', async () => {
      const mockRow = {
        id: 'notif-1',
        recipientId: 'user-1',
        senderId: 'user-2',
        type: 'leave_approval',
        title: 'Approved',
        message: 'Your leave has been approved',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2025-01-01'),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.findById('notif-1');

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['notif-1']);
      expect(result).toEqual(mockRow);
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('notif-1');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update isRead and return the notification', async () => {
      const updateDto: UpdateNotificationDto = { isRead: true, readAt: new Date('2025-01-02') };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'notif-1',
              recipientId: 'user-1',
              senderId: 'user-2',
              type: 'leave_request',
              title: 'Leave Request',
              message: 'You have a new leave request',
              metadata: null,
              isRead: true,
              readAt: new Date('2025-01-02'),
              createdAt: new Date('2025-01-01'),
            },
          ],
        })
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await repository.update('notif-1', updateDto);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE notifications'), [
        true,
        new Date('2025-01-02'),
        'notif-1',
      ]);
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'notif-1', isRead: true });
    });

    it('should return null when notification does not exist', async () => {
      const updateDto: UpdateNotificationDto = { isRead: true };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] });

      const result = await repository.update('notif-1', updateDto);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should throw when no fields to update', async () => {
      const updateDto: UpdateNotificationDto = {};

      await expect(repository.update('notif-1', updateDto)).rejects.toThrow('No fields to update');
    });
  });

  describe('findUnreadByRecipient', () => {
    it('should return unread notifications for a recipient', async () => {
      const mockRows = [
        {
          id: 'notif-1',
          recipientId: 'user-1',
          senderId: 'user-2',
          type: 'leave_request',
          title: 'Leave Request',
          message: 'You have a new leave request',
          metadata: null,
          isRead: false,
          readAt: null,
          createdAt: new Date('2025-01-01'),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await repository.findUnreadByRecipient('user-1');

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE recipient_id = $1 AND is_read = false'), ['user-1']);
      expect(result).toEqual(mockRows);
    });
  });
});
