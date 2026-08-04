import { NotificationService } from 'modules/notification/notification.service';
import { INotificationRepository } from 'modules/notification/notification.repository';
import { Notification, NotificationStatus } from 'modules/notification/notification.model';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    recipientId: 'emp-1',
    type: 'LEAVE_SUBMITTED',
    title: 'Leave Request Submitted',
    message: 'Your leave request has been submitted.',
    relatedEntityType: 'LeaveRequest',
    relatedEntityId: 'lr-1',
    status: 'PENDING' as NotificationStatus,
    createdAt: new Date('2025-06-01T12:00:00Z'),
    readAt: null,
    ...overrides,
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepo: jest.Mocked<INotificationRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findByRecipient: jest.fn(),
      markSent: jest.fn(),
      markRead: jest.fn(),
    };
    service = new NotificationService(mockRepo);
  });

  describe('notify', () => {
    it('creates a notification with PENDING status and returns it', async () => {
      const persisted = makeNotification();
      mockRepo.create.mockResolvedValueOnce(persisted);

      const result = await service.notify(
        'emp-1',
        'LEAVE_SUBMITTED',
        'Leave Request Submitted',
        'Your leave request has been submitted.',
        'LeaveRequest',
        'lr-1',
      );

      expect(result).toEqual(persisted);
      expect(mockRepo.create).toHaveBeenCalledTimes(1);

      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.recipientId).toBe('emp-1');
      expect(callArg.type).toBe('LEAVE_SUBMITTED');
      expect(callArg.title).toBe('Leave Request Submitted');
      expect(callArg.message).toBe('Your leave request has been submitted.');
      expect(callArg.relatedEntityType).toBe('LeaveRequest');
      expect(callArg.relatedEntityId).toBe('lr-1');
      expect(callArg.id).toBeDefined();
      expect(typeof callArg.id).toBe('string');
      expect(callArg.id.length).toBeGreaterThan(0);
    });

    it('defaults relatedEntityType and relatedEntityId to null when omitted', async () => {
      const persisted = makeNotification({
        relatedEntityType: null,
        relatedEntityId: null,
      });
      mockRepo.create.mockResolvedValueOnce(persisted);

      const result = await service.notify(
        'emp-2',
        'SYSTEM',
        'Welcome',
        'Welcome to the platform.',
      );

      expect(result.relatedEntityType).toBeNull();
      expect(result.relatedEntityId).toBeNull();

      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.relatedEntityType).toBeNull();
      expect(callArg.relatedEntityId).toBeNull();
    });

    it('generates a unique id for each notification', async () => {
      const persisted1 = makeNotification({ id: 'uuid-1' });
      const persisted2 = makeNotification({ id: 'uuid-2' });
      mockRepo.create.mockResolvedValueOnce(persisted1);
      mockRepo.create.mockResolvedValueOnce(persisted2);

      await service.notify('emp-1', 'T', 'T', 'M');
      await service.notify('emp-1', 'T', 'T', 'M');

      const id1 = mockRepo.create.mock.calls[0][0].id;
      const id2 = mockRepo.create.mock.calls[1][0].id;
      expect(id1).not.toBe(id2);
    });

    it('propagates repository errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockRepo.create.mockRejectedValueOnce(dbError);

      await expect(
        service.notify('emp-1', 'T', 'T', 'M'),
      ).rejects.toThrow('connection refused');
    });
  });
});
