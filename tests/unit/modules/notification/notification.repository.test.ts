import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { Pool } from 'pg';

jest.mock('pg', () => ({
  Pool: jest.fn(),
}));

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as any;
    repository = new NotificationRepository(mockPool);
    (mockPool.query as jest.Mock).mockClear();
  });

  describe('create', () => {
    it('should create a notification and return it', async () => {
      const dto = {
        recipientId: 'recipient-1',
        senderId: 'sender-1',
        type: 'leave_request' as const,
        title: 'Test Title',
        message: 'Test Message',
        metadata: { key: 'value' },
      };

      const dbRow = {
        id: 'notif-1',
        recipientId: 'recipient-1',
        senderId: 'sender-1',
        type: 'leave_request',
        title: 'Test Title',
        message: 'Test Message',
        metadata: { key: 'value' },
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-01'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [dbRow] });

      const result = await repository.create(dto);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        ['recipient-1', 'sender-1', 'leave_request', 'Test Title', 'Test Message', { key: 'value' }]
      );

      expect(result).toEqual(dbRow);
    });

    it('should handle null senderId and metadata', async () => {
      const dto = {
        recipientId: 'recipient-1',
        type: 'balance_update' as const,
        title: 'Balance Update',
        message: 'Your balance was updated',
      };

      const dbRow = {
        id: 'notif-2',
        recipientId: 'recipient-1',
        senderId: null,
        type: 'balance_update',
        title: 'Balance Update',
        message: 'Your balance was updated',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2024-01-02'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [dbRow] });

      const result = await repository.create(dto);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        ['recipient-1', null, 'balance_update', 'Balance Update', 'Your balance was updated', null]
      );

      expect(result.senderId).toBeNull();
      expect(result.metadata).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a notification when found', async () => {
      const dbRow = {
        id: 'notif-1',
        recipientId: 'recipient-1',
        senderId: 'sender-1',
        type: 'leave_approval',
        title: 'Approved',
        message: 'Your leave was approved',
        metadata: null,
        isRead: true,
        readAt: new Date('2024-01-03'),
        createdAt: new Date('2024-01-01'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [dbRow] });

      const result = await repository.findById('notif-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, recipient_id AS "recipientId"'),
        ['notif-1']
      );

      expect(result).toEqual(dbRow);
    });

    it('should return null when notification not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update isRead and return updated notification', async () => {
      const dbRow = {
        id: 'notif-1',
        recipientId: 'recipient-1',
        senderId: 'sender-1',
        type: 'leave_request',
        title: 'Test',
        message: 'Test message',
        metadata: null,
        isRead: true,
        readAt: new Date('2024-01-04'),
        createdAt: new Date('2024-01-01'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [dbRow] });

      const result = await repository.update('notif-1', { isRead: true, readAt: new Date('2024-01-04') });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [true, new Date('2024-01-04'), 'notif-1']
      );

      expect(result.isRead).toBe(true);
      expect(result.readAt).toEqual(new Date('2024-01-04'));
    });

    it('should throw error when notification not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(repository.update('non-existent', { isRead: true }))
        .rejects.toThrow('Notification with id non-existent not found');
    });

    it('should throw error when no fields to update', async () => {
      await expect(repository.update('notif-1', {}))
        .rejects.toThrow('No fields to update');
    });
  });

  describe('findUnreadByRecipient', () => {
    it('should return unread notifications for a recipient', async () => {
      const dbRows = [
        {
          id: 'notif-1',
          recipientId: 'recipient-1',
          senderId: 'sender-1',
          type: 'leave_request',
          title: 'Request 1',
          message: 'Message 1',
          metadata: null,
          isRead: false,
          readAt: null,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'notif-2',
          recipientId: 'recipient-1',
          senderId: 'sender-2',
          type: 'leave_approval',
          title: 'Approval 1',
          message: 'Message 2',
          metadata: { data: 'test' },
          isRead: false,
          readAt: null,
          createdAt: new Date('2024-01-01'),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: dbRows });

      const result = await repository.findUnreadByRecipient('recipient-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, recipient_id AS "recipientId"'),
        ['recipient-1']
      );

      expect(result).toHaveLength(2);
      expect(result[0].isRead).toBe(false);
      expect(result[1].isRead).toBe(false);
      expect(result[0].createdAt > result[1].createdAt).toBe(true);
    });

    it('should return empty array when no unread notifications', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.findUnreadByRecipient('recipient-1');

      expect(result).toEqual([]);
    });
  });
});
