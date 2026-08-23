import { NotificationService } from 'modules/notification/notification.service';
import {
  Notification,
  INotificationRepository,
  NotificationNotFoundError,
  InvalidNotificationTypeError,
  EmptyNotificationContentError,
} from 'modules/notification/notification.model';

function makeMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    recipientId: 'user-1',
    title: 'Test',
    body: 'Test body',
    type: 'EMAIL',
    isRead: false,
    metadata: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let repo: jest.Mocked<INotificationRepository>;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      create: jest.fn(),
      findByRecipient: jest.fn(),
      markAsRead: jest.fn(),
    };
    service = new NotificationService(repo);
  });

  describe('send', () => {
    it('creates a notification with isRead=false and createdAt set', async () => {
      const created = makeMockNotification();
      repo.create.mockResolvedValue(created);

      const result = await service.send('user-1', 'Test', 'Test body', 'EMAIL');

      expect(result.isRead).toBe(false);
      expect(result.createdAt).toBeDefined();
      expect(repo.create).toHaveBeenCalledWith({
        recipientId: 'user-1',
        title: 'Test',
        body: 'Test body',
        type: 'EMAIL',
        metadata: null,
      });
    });

    it('throws EmptyNotificationContentError when title is empty', async () => {
      await expect(
        service.send('user-1', '', 'Test body', 'EMAIL')
      ).rejects.toThrow(EmptyNotificationContentError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws EmptyNotificationContentError when body is empty', async () => {
      await expect(
        service.send('user-1', 'Test', '', 'EMAIL')
      ).rejects.toThrow(EmptyNotificationContentError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws EmptyNotificationContentError when title is whitespace only', async () => {
      await expect(
        service.send('user-1', '   ', 'Test body', 'EMAIL')
      ).rejects.toThrow(EmptyNotificationContentError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws InvalidNotificationTypeError when type is not EMAIL or IN_APP', async () => {
      await expect(
        service.send('user-1', 'Test', 'Test body', 'SMS' as 'EMAIL')
      ).rejects.toThrow(InvalidNotificationTypeError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('creates notification with metadata when provided', async () => {
      const metadata = { key: 'value' };
      const created = makeMockNotification({ metadata });
      repo.create.mockResolvedValue(created);

      const result = await service.send(
        'user-1',
        'Test',
        'Test body',
        'EMAIL',
        metadata
      );

      expect(result.metadata).toEqual(metadata);
      expect(repo.create).toHaveBeenCalledWith({
        recipientId: 'user-1',
        title: 'Test',
        body: 'Test body',
        type: 'EMAIL',
        metadata,
      });
    });
  });

  describe('getForUser', () => {
    it('returns notifications for a recipient', async () => {
      const notifications = [
        makeMockNotification(),
        makeMockNotification({ id: 'notif-2', title: 'Other' }),
      ];
      repo.findByRecipient.mockResolvedValue(notifications);

      const result = await service.getForUser('user-1');

      expect(result).toEqual(notifications);
      expect(repo.findByRecipient).toHaveBeenCalledWith('user-1', undefined);
    });

    it('passes limit to repository', async () => {
      repo.findByRecipient.mockResolvedValue([]);

      await service.getForUser('user-1', 5);

      expect(repo.findByRecipient).toHaveBeenCalledWith('user-1', 5);
    });
  });

  describe('markRead', () => {
    it('marks a notification as read', async () => {
      const notification = makeMockNotification();
      repo.findById.mockResolvedValue(notification);
      repo.markAsRead.mockResolvedValue(undefined);

      await service.markRead('notif-1');

      expect(repo.findById).toHaveBeenCalledWith('notif-1');
      expect(repo.markAsRead).toHaveBeenCalledWith('notif-1');
    });

    it('throws NotificationNotFoundError when notification does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.markRead('nonexistent')).rejects.toThrow(
        NotificationNotFoundError
      );
      expect(repo.markAsRead).not.toHaveBeenCalled();
    });

    it('is idempotent: calling markRead on already-read notification does not throw', async () => {
      const notification = makeMockNotification({ isRead: true });
      repo.findById.mockResolvedValue(notification);
      repo.markAsRead.mockResolvedValue(undefined);

      await expect(service.markRead('notif-1')).resolves.toBeUndefined();
    });
  });
});
