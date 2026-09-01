import { PoolClient } from 'pg';
import {
  CreateNotificationInput,
  InvalidNotificationTransitionError,
  Notification,
  NotificationService,
  PgNotificationRepository,
} from '../../../../src/modules/notification';
import { INotificationRepository } from '../../../../src/modules/notification/notification.model';
import { IUnitOfWork } from '../../../../src/shared/db/unit-of-work';
import { NotificationType } from '../../../../src/shared/types';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    recipientId: 'emp-1',
    type: NotificationType.LEAVE_REQUEST_APPROVED,
    title: 'Leave approved',
    message: 'Your leave request was approved.',
    relatedEntityType: 'leave_request',
    relatedEntityId: 'lr-1',
    status: 'PENDING',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
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
  let notifications: jest.Mocked<INotificationRepository>;
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
    uow = {
      withTransaction: jest.fn(),
    };
    uow.withTransaction.mockImplementation(async (fn) => fn(fakeClient));

    service = new NotificationService(
      notifications as unknown as PgNotificationRepository,
      uow,
    );
  });

  it('create assigns id/createdAt, status=PENDING, readAt=null and delegates to repo.create', async () => {
    const input = createInput();
    notifications.create.mockResolvedValue(makeNotification());

    const result = await service.create(input);

    expect(notifications.create).toHaveBeenCalledTimes(1);
    const calledWith = notifications.create.mock.calls[0][0];
    expect(typeof calledWith.id).toBe('string');
    expect(calledWith.id.length).toBeGreaterThan(0);
    expect(calledWith.createdAt).toBeInstanceOf(Date);
    expect(calledWith.status).toBe('PENDING');
    expect(calledWith.readAt).toBeNull();
    expect(calledWith.recipientId).toBe(input.recipientId);
    expect(calledWith.type).toBe(input.type);
    expect(result).toBeDefined();
  });

  it('findByRecipient delegates to repo.findByRecipient', async () => {
    const notification = makeNotification();
    notifications.findByRecipient.mockResolvedValue([notification]);

    const result = await service.findByRecipient('emp-1');

    expect(notifications.findByRecipient).toHaveBeenCalledWith('emp-1', undefined);
    expect(result).toEqual([notification]);
  });

  it('markRead wraps the repository call in a transaction', async () => {
    const read = makeNotification({ status: 'READ', readAt: new Date() });
    notifications.markRead.mockResolvedValue(read);

    const result = await service.markRead('notif-1');

    expect(uow.withTransaction).toHaveBeenCalledTimes(1);
    expect(notifications.markRead).toHaveBeenCalledWith('notif-1', fakeClient);
    expect(result).toEqual(read);
  });

  it('markRead propagates InvalidNotificationTransitionError when not PENDING/SENT', async () => {
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
