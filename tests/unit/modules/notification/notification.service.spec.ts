import { NotificationService } from '../../../../src/modules/notification/notification.service';
import {
  NotificationNotFoundError,
  InvalidNotificationError,
} from '../../../../src/modules/notification/notification.errors';
import type { INotificationRepository } from '../../../../src/modules/notification/notification.repository';
import type {
  Notification,
  CreateNotificationInput,
} from '../../../../src/modules/notification/notification.model';
import { NotificationStatus } from '../../../../src/shared/types';

describe('NotificationService', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  function makeNotification(
    id: string,
    overrides: Partial<Notification> = {}
  ): Notification {
    return {
      id,
      recipientId: 'emp-1',
      type: 'LEAVE_REQUEST_APPROVED',
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

  describe('create', () => {
    it('delegates create to the injected repository', async () => {
      const notification = makeNotification('notif-1');
      const repository = makeRepository();
      (repository.create as jest.Mock).mockResolvedValue(notification);
      const service = new NotificationService(repository);

      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'LEAVE_REQUEST_APPROVED',
        title: 'Leave approved',
        message: 'Your leave request was approved',
      };

      await expect(service.create(input)).resolves.toBe(notification);
      expect(repository.create).toHaveBeenCalledWith(input, undefined);
    });

    it('allows both related entity fields to be null', async () => {
      const notification = makeNotification('notif-1');
      const repository = makeRepository();
      (repository.create as jest.Mock).mockResolvedValue(notification);
      const service = new NotificationService(repository);

      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'ANNOUNCEMENT',
        title: 'Welcome',
        message: 'Welcome to the team',
        relatedEntityType: null,
        relatedEntityId: null,
      };

      await expect(service.create(input)).resolves.toBe(notification);
      expect(repository.create).toHaveBeenCalledWith(input, undefined);
    });

    it('allows both related entity fields to be set', async () => {
      const notification = makeNotification('notif-1', {
        relatedEntityType: 'LEAVE_REQUEST',
        relatedEntityId: 'req-1',
      });
      const repository = makeRepository();
      (repository.create as jest.Mock).mockResolvedValue(notification);
      const service = new NotificationService(repository);

      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'LEAVE_REQUEST_APPROVED',
        title: 'Leave approved',
        message: 'Your leave request was approved',
        relatedEntityType: 'LEAVE_REQUEST',
        relatedEntityId: 'req-1',
      };

      await expect(service.create(input)).resolves.toBe(notification);
      expect(repository.create).toHaveBeenCalledWith(input, undefined);
    });

    it('rejects a mixed pair (type set, id null)', () => {
      const repository = makeRepository();
      const service = new NotificationService(repository);

      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'LEAVE_REQUEST_APPROVED',
        title: 'Leave approved',
        message: 'Your leave request was approved',
        relatedEntityType: 'LEAVE_REQUEST',
        relatedEntityId: null,
      };

      expect(() => service.create(input)).toThrow(InvalidNotificationError);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a mixed pair (type null, id set)', () => {
      const repository = makeRepository();
      const service = new NotificationService(repository);

      const input: CreateNotificationInput = {
        recipientId: 'emp-1',
        type: 'LEAVE_REQUEST_APPROVED',
        title: 'Leave approved',
        message: 'Your leave request was approved',
        relatedEntityType: null,
        relatedEntityId: 'req-1',
      };

      expect(() => service.create(input)).toThrow(InvalidNotificationError);
      expect(repository.create).not.toHaveBeenCalled();
    });
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

    await expect(service.findByEntity('LEAVE_REQUEST', 'req-1')).resolves.toBe(notifications);
    expect(repository.findByEntity).toHaveBeenCalledWith('LEAVE_REQUEST', 'req-1');
  });

  it('delegates updateStatus to the injected repository', async () => {
    const notification = makeNotification('notif-1', { status: NotificationStatus.SENT });
    const repository = makeRepository();
    (repository.updateStatus as jest.Mock).mockResolvedValue(notification);
    const service = new NotificationService(repository);

    await expect(
      service.updateStatus('notif-1', NotificationStatus.SENT)
    ).resolves.toBe(notification);
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'notif-1',
      NotificationStatus.SENT,
      undefined
    );
  });

  it('delegates markRead to the injected repository', async () => {
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

describe('notification errors', () => {
  it('NotificationNotFoundError carries the NOTIFICATION_NOT_FOUND code', () => {
    const err = new NotificationNotFoundError('notif-1');
    expect(err.code).toBe('NOTIFICATION_NOT_FOUND');
    expect(err.message).toContain('notif-1');
  });

  it('InvalidNotificationError carries the INVALID_NOTIFICATION code', () => {
    const err = new InvalidNotificationError('bad pair');
    expect(err.code).toBe('INVALID_NOTIFICATION');
    expect(err.message).toBe('bad pair');
  });
});
