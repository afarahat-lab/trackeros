import { PgNotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { NotificationStatus } from '../../../../src/modules/notification/notification.model';

describe('PgNotificationRepository', () => {
  let repository: PgNotificationRepository;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    repository = new PgNotificationRepository(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByRecipient', () => {
    it('should return notifications for a recipient without options', async () => {
      const notifications = [{ id: '1', recipientId: 'emp1' }];
      mockPool.query.mockResolvedValue({ rows: notifications });

      const result = await repository.findByRecipient('emp1');

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notifications WHERE recipient_id = $1'),
        ['emp1']
      );
      expect(result).toEqual(notifications);
    });

    it('should apply status, limit, and offset filters', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findByRecipient('emp1', { status: 'sent', limit: 10, offset: 5 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $2'),
        expect.arrayContaining(['emp1', 'sent', 10, 5])
      );
    });
  });

  describe('markAsSent', () => {
    it('should update status to sent', async () => {
      mockPool.query.mockResolvedValue({});

      await repository.markAsSent('1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications SET status = $1'),
        [NotificationStatus.SENT, '1']
      );
    });
  });

  describe('markAsRead', () => {
    it('should update status to read and set read_at', async () => {
      mockPool.query.mockResolvedValue({});

      await repository.markAsRead('1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications SET status = $1, read_at = NOW()'),
        [NotificationStatus.READ, '1']
      );
    });
  });

  describe('countUnread', () => {
    it('should return count of unread notifications', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await repository.countUnread('emp1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND status != $2'),
        ['emp1', NotificationStatus.READ]
      );
      expect(result).toBe(5);
    });
  });
});
