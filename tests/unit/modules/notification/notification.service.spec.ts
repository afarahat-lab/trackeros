import { NotificationService } from '../../../../src/modules/notification/notification.service';
import type { INotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { NotificationStatus } from '../../../../src/shared/types';
import type {
  Notification,
  CreateNotificationInput,
} from '../../../../src/modules/notification/notification.model';

describe('NotificationService', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  function makeNotification(id: string, overrides: Partial<Notification> = {}): Notification {
    return {
      id,
      recipientId: 'emp-1',
      type: 'LEAVE_APPROVED',
      title: 'Leave approved',
      message: 'Your leave request was approved',
      relatedEntityType: null,
      relatedEntityId: null,
      status: NotificationStatus.PENDING,
      createdAt: now,
      readAt: null,
      ...overrides,
    };
  }

  function makeRepository(): INotificationRepository {
    return {
      create: jest.fn(),
      findByRecipient: jest.fn(),
      findByEntity: jest.fn(),
      updateStatus: jest.fn(),
      markRead: jest.fn(),
    };
  }

  it('delegates create to the injected repository with an undefined client', async () => {
    const notification = makeNotification('notif-1');
    const repository = makeRepository();
    (repository.create as jest.Mock).mockResolvedValue(notification);
    const service = new NotificationService(repository);

    const input: CreateNotificationInput = {
      recipientId: 'emp-1',
      type: 'LEAVE_APPROVED',
      title: 'Leave approved',
      message: 'Your leave request was approved',
    };

    await expect(service.create(input)).resolves.toBe(notification);
    expect(repository.create).toHaveBeenCalledWith(input, undefined);
  });

  it('delegates findByRecipient to the injected repository', async () => {
    const notifications = [makeNotification('notif-1')];
    const repository = makeRepository();
    (repository.findByRecipient as jest.Mock).mockResolvedValue(notifications);
    const service = new NotificationService(repository);

    await expect(service.findByRecipient('emp-1')).resolves.toBe(notifications);
    expect(repository.findByRecipient).toHaveBeenCalledWith('emp-1');
  });

  it('delegates findByEntity to the injected repository', async () => {
    const notifications = [makeNotification('notif-1')];
    const repository = makeRepository();
    (repository.findByEntity as jest.Mock).mockResolvedValue(notifications);
    const service = new NotificationService(repository);

    await expect(service.findByEntity('leave_request', 'lr-1')).resolves.toBe(notifications);
    expect(repository.findByEntity).toHaveBeenCalledWith('leave_request', 'lr-1');
  });

  it('delegates updateStatus to the injected repository with an undefined client', async () => {
    const notification = makeNotification('notif-1', { status: NotificationStatus.READ });
    const repository = makeRepository();
    (repository.updateStatus as jest.Mock).mockResolvedValue(notification);
    const service = new NotificationService(repository);

    await expect(service.updateStatus('notif-1', NotificationStatus.READ)).resolves.toBe(
      notification
    );
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'notif-1',
      NotificationStatus.READ,
      undefined
    );
  });

  it('delegates markRead to the injected repository with an undefined client', async () => {
    const notification = makeNotification('notif-1', {
      status: NotificationStatus.READ,
      readAt: now,
    });
    const repository = makeRepository();
    (repository.markRead as jest.Mock).mockResolvedValue(notification);
    const service = new NotificationService(repository);

    await expect(service.markRead('notif-1')).resolves.toBe(notification);
    expect(repository.markRead).toHaveBeenCalledWith('notif-1', undefined);
  });
});
