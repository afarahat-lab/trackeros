import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';
import pool from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  const mockQuery = (pool as any).query as jest.Mock;

  beforeEach(() => {
    repository = new NotificationRepository();
    mockQuery.mockClear();
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
        recipient_id: 'recipient-1',
        sender_id: 'sender-1',
        type: 'leave_request',
        title: 'Test Title',
        message: 'Test Message',
        metadata: { key: 'value' },
        is_read: false,
        read_at: null,
        created_at: new Date('2024-01-01'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [dbRow] });

      const result = await repository.create(dto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        ['recipient-1', 'sender-1', 'leave_request', 'Test Title', 'Test Message', JSON.stringify({ key: 'value' })]
      );

      expect(result).toEqual({
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
      });
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
        recipient_id: 'recipient-1',
        sender_id: null,
        type: 'balance_update',
        title: 'Balance Update',
        message: 'Your balance was updated',
        metadata: null,
        is_read: false,
        read_at: null,
        created_at: new Date('2024-01-02'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [dbRow] });

      const result = await repository.create(dto);

      expect(mockQuery).toHaveBeenCalledWith(
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
        recipient_id: 'recipient-1',
        sender_id: 'sender-1',
        type: 'leave_approval',
        title: 'Approved',
        message: 'Your leave was approved',
        metadata: null,
        is_read: true,
        read_at: new Date('2024-01-03'),
        created_at: new Date('2024-01-01'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [dbRow] });

      const result = await repository.findById('notif-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM notifications WHERE id = $1',
        ['notif-1']
      );

      expect(result).toEqual({
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
      });
    });

    it('should return null when notification not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update isRead and return updated notification', async () => {
      const dbRow = {
        id: 'notif-1',
        recipient_id: 'recipient-1',
        sender_id: 'sender-1',
        type: 'leave_request',
        title: 'Test',
        message: 'Test message',
        metadata: null,
        is_read: true,
        read_at: new Date('2024-01-04'),
        created_at: new Date('2024-01-01'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [dbRow] });

      const result = await repository.update('notif-1', { isRead: true, readAt: new Date('2024-01-04') });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [true, new Date('2024-01-04'), 'notif-1']
      );

      expect(result.isRead).toBe(true);
      expect(result.readAt).toEqual(new Date('2024-01-04'));
    });

    it('should throw error when notification not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(repository.update('non-existent', { isRead: true }))
        .rejects.toThrow('Notification with ID non-existent not found');
    });

    it('should return current notification when no fields to update', async () => {
      const dbRow = {
        id: 'notif-1',
        recipient_id: 'recipient-1',
        sender_id: null,
        type: 'policy_change',
        title: 'Policy',
        message: 'Policy changed',
        metadata: null,
        is_read: false,
        read_at: null,
        created_at: new Date('2024-01-01'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [dbRow] });

      const result = await repository.update('notif-1', {});

      expect(result).toBeDefined();
      expect(result.id).toBe('notif-1');
    });
  });

  describe('findUnreadByRecipient', () => {
    it('should return unread notifications for a recipient', async () => {
      const dbRows = [
        {
          id: 'notif-1',
          recipient_id: 'recipient-1',
          sender_id: 'sender-1',
          type: 'leave_request',
          title: 'Request 1',
          message: 'Message 1',
          metadata: null,
          is_read: false,
          read_at: null,
          created_at: new Date('2024-01-02'),
        },
        {
          id: 'notif-2',
          recipient_id: 'recipient-1',
          sender_id: 'sender-2',
          type: 'leave_approval',
          title: 'Approval 1',
          message: 'Message 2',
          metadata: { data: 'test' },
          is_read: false,
          read_at: null,
          created_at: new Date('2024-01-01'),
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: dbRows });

      const result = await repository.findUnreadByRecipient('recipient-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notifications WHERE recipient_id = $1 AND is_read = false'),
        ['recipient-1']
      );

      expect(result).toHaveLength(2);
      expect(result[0].isRead).toBe(false);
      expect(result[1].isRead).toBe(false);
      expect(result[0].createdAt > result[1].createdAt).toBe(true);
    });

    it('should return empty array when no unread notifications', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findUnreadByRecipient('recipient-1');

      expect(result).toEqual([]);
    });
  });
});
