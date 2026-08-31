import { PoolClient } from 'pg';
import {
  CreateNotificationInput,
  InvalidNotificationTransitionError,
  Notification,
  NotificationService,
  PgNotificationRepository,
} from '../../../../src/modules/notification';
import { IUnitOfWork } from '../../../../src/shared/db/unit-of-work';
import { NotificationType } from '../../../../src/shared/types';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    recipientId: 'emp-1',
    type: NotificationType.LEAVE_REQUEST_APPROVED,
    title: 'Leave approved',
    message: 'Your leave request was approved.',
    relatedEntityType: 'LEAVE_REQUEST',
    relatedEntityId: 'req-1',
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    readAt: null,
    ...overrides,
  };
}

function createInput(
  overrides: Partial<CreateNotificationInput> = {},
): CreateNotificationInput {
  const notification = makeNotification();
  return {
    recipientId: notification.recipientId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    relatedEntityType: notification.relatedEntityType,
    relatedEntityId: notification.relatedEntityId,
    ...overrides,
  };
}

describe('NotificationService', () => {
  let notifications: {
    create: jest.Mock;
    findById: jest.Mock;
    findByRecipient: jest.Mock;
    markRead: jest.Mock;
  };
  let uow: jest.Mocked<IUnitOfWork>;
  let service: NotificationService;
  const fakeClient = {} as PoolClient;

  beforeEach(() => {
    notifications = {
      create: jest.fn(),
      findById: jest.fn(),
      findByRecipient: jest.fn(),
      markRead: jest.fn(),
    };
    uow = { withTransaction: jest.fn() };
    uow.withTransaction.mockImplementation(async (fn) => fn(fakeClient));

    service = new NotificationService(
      notifications as unknown as PgNotificationRepository,
      uow,
    );
  });

  describe('create', () => {
    it('creates a notification with status PENDING and readAt null', async () => {
      const input = createInput();
      notifications.create.mockResolvedValue(makeNotification());

      const result = await service.create(input);

      const created = notifications.create.mock.calls[0][0] as Notification;
      expect(created.status).toBe('PENDING');
      expect(created.readAt).toBeNull();
      expect(created.type).toBe(input.type);
      expect(typeof created.id).toBe('string');
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(result).toBeDefined();
    });

    it('rejects an unknown NotificationType value', async () => {
      const input = createInput({
        type: 'NOT_A_REAL_TYPE' as unknown as NotificationType,
      });

      await expect(service.create(input)).rejects.toThrow(
        InvalidNotificationTransitionError,
      );
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('markRead', () => {
    it('translates the "transition to READ" to repo.markRead inside a transaction', async () => {
      const read = makeNotification({
        status: 'READ',
        readAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      notifications.markRead.mockResolvedValue(read);

      const result = await service.markRead('notif-1');

      expect(notifications.markRead).toHaveBeenCalledWith('notif-1', fakeClient);
      expect(result.status).toBe('READ');
      expect(result.readAt).toBeInstanceOf(Date);
    });

    it('throws InvalidNotificationTransitionError when not PENDING or SENT', async () => {
      notifications.markRead.mockRejectedValue(
        new InvalidNotificationTransitionError(
          'notification notif-1 cannot transition to READ from its current status',
        ),
      );

      await expect(service.markRead('notif-1')).rejects.toThrow(
        InvalidNotificationTransitionError,
      );
    });
  });

  describe('findByRecipient', () => {
    it('delegates to repo.findByRecipient', async () => {
      const notification = makeNotification();
      notifications.findByRecipient.mockResolvedValue([notification]);

      const result = await service.findByRecipient('emp-1');

      expect(notifications.findByRecipient).toHaveBeenCalledWith(
        'emp-1',
        undefined,
      );
      expect(result).toEqual([notification]);
    });
  });
});
