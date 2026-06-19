import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { Pool } from 'pg';

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    repository = new NotificationRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a notification and return the created row', async () => {
      const dto = {
        recipientId: 'user-1',
        senderId: 'user-2',
        type: 'leave_request' as const,
        title: 'Leave Request',
        message: 'You have a new leave request',
        metadata: { requestId: 'req-1' },
      };

      const expectedRow = {
        id: 'notif-1',
        recipientId: 'user-1',
        senderId: 'user-2',
        type: 'leave_request',
        title: 'Leave Request',
        message: 'You have a new leave request',
        metadata: { requestId: 'req-1' },
        isRead: false,
        readAt: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [expectedRow] });

      const result = await repository.create(dto);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [dto.recipientId, dto.senderId, dto.type, dto.title, dto.message, dto.metadata],
      );
      expect(result).toEqual(expectedRow);
    });

    it('should handle missing senderId and metadata', async () => {
      const dto = {
        recipientId: 'user-1',
        type: 'balance_update' as const,
        title: 'Balance Updated',
        message: 'Your balance has been updated',
      };

      const expectedRow = {
        id: 'notif-2',
        recipientId: 'user-1',
        senderId: null,
        type: 'balance_update',
        title: 'Balance Updated',
        message: 'Your balance has been updated',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [expectedRow] });

      const result = await repository.create(dto);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [dto.recipientId, null, dto.type, dto.title, dto.message, null],
      );
      expect(result).toEqual(expectedRow);
    });
  });

  describe('findById', () => {
    it('should return a notification when found', async () => {
      const id = 'notif-1';
      const expectedRow = {
        id,
        recipientId: 'user-1',
        senderId: 'user-2',
        type: 'leave_request',
        title: 'Leave Request',
        message: 'You have a new leave request',
        metadata: { requestId: 'req-1' },
        isRead: false,
        readAt: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [expectedRow] });

      const result = await repository.findById(id);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [id]);
      expect(result).toEqual(expectedRow);
    });

    it('should return null when no notification is found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update isRead and return the updated row', async () => {
      const id = 'notif-1';
      const updateDto = { isRead: true, readAt: new Date('2025-01-02T00:00:00.000Z') };

      const expectedRow = {
        id,
        recipientId: 'user-1',
        senderId: 'user-2',
        type: 'leave_request',
        title: 'Leave Request',
        message: 'You have a new leave request',
        metadata: { requestId: 'req-1' },
        isRead: true,
        readAt: new Date('2025-01-02T00:00:00.000Z'),
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [expectedRow] });

      const result = await repository.update(id, updateDto);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        [true, new Date('2025-01-02T00:00:00.000Z'), id],
      );
      expect(result).toEqual(expectedRow);
    });

    it('should throw if no fields are provided', async () => {
      await expect(repository.update('notif-1', {})).rejects.toThrow('No fields to update');
    });

    it('should throw if the notification does not exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(repository.update('notif-1', { isRead: true })).rejects.toThrow(
        'Notification with ID notif-1 not found',
      );
    });
  });

  describe('findUnreadByRecipient', () => {
    it('should return unread notifications for a recipient', async () => {
      const recipientId = 'user-1';
      const expectedRows = [
        {
          id: 'notif-1',
          recipientId,
          senderId: 'user-2',
          type: 'leave_request',
          title: 'Leave Request',
          message: 'You have a new leave request',
          metadata: { requestId: 'req-1' },
          isRead: false,
          readAt: null,
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: expectedRows });

      const result = await repository.findUnreadByRecipient(recipientId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [recipientId],
      );
      expect(result).toEqual(expectedRows);
    });

    it('should return an empty array when no unread notifications exist', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repository.findUnreadByRecipient('user-1');

      expect(result).toEqual([]);
    });
  });
});
