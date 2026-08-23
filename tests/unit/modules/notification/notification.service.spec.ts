import { NotificationService } from 'modules/notification/notification.service';
import { Notification, INotificationRepository } from 'modules/notification/notification.model';

function makeMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: '1',
    recipientId: 'user-1',
    title: 'Leave Approved',
    body: 'Your leave request has been approved.',
    type: 'IN_APP',
    isRead: false,
    metadata: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function createMockRepo(): jest.Mocked<INotificationRepository> {
  return {
    create: jest.fn(),
    findByRecipient: jest.fn(),
    markAsRead: jest.fn(),
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let repo: jest.Mocked<INotificationRepository>;

  beforeEach(() => {
    repo = createMockRepo();
    service = new NotificationService(repo);
  });

  describe('send', () => {
    it('delegates to repository.create with correct fields and returns the created Notification', async () => {
      const created = makeMockNotification();
      repo.create.mockResolvedValue(created);

      const result = await service.send(
        'user-1',
        'Leave Approved',
        'Your leave request has been approved.',
        'IN_APP',
      );

      expect(repo.create).toHaveBeenCalledWith({
        recipientId: 'user-1',
        title: 'Leave Approved',
        body: 'Your leave request has been approved.',
        type: 'IN_APP',
        metadata: null,
      });
      expect(result).toEqual(created);
    });

    it('passes metadata when provided', async () => {
      const created = makeMockNotification({ metadata: { leaveId: 'lr-1' } });
      repo.create.mockResolvedValue(created);

      const result = await service.send(
        'user-1',
        'Leave Approved',
        'Your leave request has been approved.',
        'IN_APP',
        { leaveId: 'lr-1' },
      );

      expect(repo.create).toHaveBeenCalledWith({
        recipientId: 'user-1',
        title: 'Leave Approved',
        body: 'Your leave request has been approved.',
        type: 'IN_APP',
        metadata: { leaveId: 'lr-1' },
      });
      expect(result).toEqual(created);
    });
  });

  describe('getForUser', () => {
    it('delegates to repository.findByRecipient with correct args and returns results', async () => {
      const notifications = [makeMockNotification()];
      repo.findByRecipient.mockResolvedValue(notifications);

      const result = await service.getForUser('user-1');
      expect(repo.findByRecipient).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual(notifications);
    });

    it('passes optional limit parameter to repository', async () => {
      const notifications = [makeMockNotification()];
      repo.findByRecipient.mockResolvedValue(notifications);

      const result = await service.getForUser('user-1', 5);
      expect(repo.findByRecipient).toHaveBeenCalledWith('user-1', 5);
      expect(result).toEqual(notifications);
    });

    it('returns empty array when no notifications exist', async () => {
      repo.findByRecipient.mockResolvedValue([]);

      const result = await service.getForUser('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('markRead', () => {
    it('delegates to repository.markAsRead with correct id', async () => {
      repo.markAsRead.mockResolvedValue(undefined);

      await service.markRead('1');
      expect(repo.markAsRead).toHaveBeenCalledWith('1');
    });

    it('is idempotent — calling on already-read notification does not throw', async () => {
      repo.markAsRead.mockResolvedValue(undefined);

      await service.markRead('already-read-id');
      expect(repo.markAsRead).toHaveBeenCalledWith('already-read-id');
    });

    it('does not throw when notification does not exist', async () => {
      repo.markAsRead.mockResolvedValue(undefined);

      await expect(service.markRead('nonexistent')).resolves.toBeUndefined();
    });
  });
});
