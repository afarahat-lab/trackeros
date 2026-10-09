import { Notification, CreateNotificationInput } from '../../../src/modules/notification';
import { INotificationRepository } from '../../../src/modules/notification';
import { NotificationService } from '../../../src/modules/notification';
import { ValidationError, NotFoundError } from '../../../src/shared/errors';
import { NotificationStatus } from '../../../src/shared/types';

class FakeNotificationRepository implements INotificationRepository {
  private rows: Notification[] = [];
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `notif-${this.sequence}`;
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification: Notification = {
      id: this.nextId(),
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      status: input.status ?? NotificationStatus.PENDING,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      readAt: null,
    };
    this.rows.push(notification);
    return notification;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.rows.find((n) => n.id === id) ?? null;
  }

  async updateStatus(
    id: string,
    status: Notification['status'],
    readAt: Date | null
  ): Promise<Notification | null> {
    const notification = this.rows.find((n) => n.id === id);
    if (!notification) {
      return null;
    }
    notification.status = status;
    notification.readAt = readAt;
    return notification;
  }
}

function makeInput(overrides: Partial<CreateNotificationInput> = {}): CreateNotificationInput {
  return {
    recipientId: 'emp-1',
    type: 'leave_request',
    title: 'Leave request approved',
    message: 'Your leave request has been approved.',
    relatedEntityType: 'leave_request',
    relatedEntityId: 'req-1',
    ...overrides,
  };
}

describe('NotificationService', () => {
  let repository: FakeNotificationRepository;
  let service: NotificationService;

  beforeEach(() => {
    repository = new FakeNotificationRepository();
    service = new NotificationService(repository);
  });

  describe('create', () => {
    it('returns a Notification with status PENDING and null readAt by default', async () => {
      const input = makeInput();
      const notification = await service.create(input);

      expect(notification.id).toBeDefined();
      expect(notification.createdAt).toBeDefined();
      expect(notification.recipientId).toBe(input.recipientId);
      expect(notification.type).toBe(input.type);
      expect(notification.title).toBe(input.title);
      expect(notification.message).toBe(input.message);
      expect(notification.relatedEntityType).toBe(input.relatedEntityType);
      expect(notification.relatedEntityId).toBe(input.relatedEntityId);
      expect(notification.status).toBe(NotificationStatus.PENDING);
      expect(notification.readAt).toBeNull();
    });

    it('persists a supplied status', async () => {
      const notification = await service.create(
        makeInput({ status: NotificationStatus.SENT })
      );

      expect(notification.status).toBe(NotificationStatus.SENT);
    });

    it('rejects an empty recipientId with ValidationError', async () => {
      await expect(service.create(makeInput({ recipientId: '' }))).rejects.toThrow(
        ValidationError
      );
    });

    it('rejects an empty type with ValidationError', async () => {
      await expect(service.create(makeInput({ type: ' ' }))).rejects.toThrow(ValidationError);
    });

    it('rejects an empty title with ValidationError', async () => {
      await expect(service.create(makeInput({ title: '' }))).rejects.toThrow(ValidationError);
    });

    it('rejects an empty message with ValidationError', async () => {
      await expect(service.create(makeInput({ message: '' }))).rejects.toThrow(ValidationError);
    });

    it('rejects a non-NotificationStatus status with ValidationError', async () => {
      await expect(
        service.create(makeInput({ status: 'INVALID' as NotificationStatus }))
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('returns the notification when found', async () => {
      const created = await service.create(makeInput());
      const found = await service.getById(created.id);

      expect(found).toEqual(created);
    });

    it('throws NotFoundError when the id is unknown', async () => {
      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('markRead', () => {
    it('sets status READ and readAt', async () => {
      const created = await service.create(makeInput());
      const updated = await service.markRead(created.id);

      expect(updated.status).toBe(NotificationStatus.READ);
      expect(updated.readAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundError when the id is unknown', async () => {
      await expect(service.markRead('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
