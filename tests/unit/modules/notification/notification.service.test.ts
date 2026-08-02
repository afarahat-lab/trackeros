import { NotificationService } from '../../../../src/modules/notification/notification.service';
import type { INotificationRepository } from '../../../../src/modules/notification/notification.repository';
import type { Notification } from '../../../../src/modules/notification/notification.model';

function makeMockRepo(): jest.Mocked<INotificationRepository> {
  return {
    create: jest.fn(),
    updateStatus: jest.fn(),
    findByRecipient: jest.fn(),
  };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-001',
    recipientId: 'emp-001',
    recipientEmail: 'emp-001@example.com',
    subject: 'Leave Request Submitted',
    body: 'Your leave request lr-001 has been submitted.',
    sentAt: null,
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepo: jest.Mocked<INotificationRepository>;

  beforeEach(() => {
    mockRepo = makeMockRepo();
    service = new NotificationService(mockRepo);
    jest.clearAllMocks();
  });

  describe('notifyLeaveSubmitted', () => {
    it('should persist a PENDING notification via the repository', async () => {
      const persisted = makeNotification();
      mockRepo.create.mockResolvedValueOnce(persisted);

      await service.notifyLeaveSubmitted('emp-001', 'lr-001');

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.recipientId).toBe('emp-001');
      expect(callArg.recipientEmail).toBe('emp-001@example.com');
      expect(callArg.subject).toBe('Leave Request Submitted');
      expect(callArg.body).toContain('lr-001');
      expect(callArg.status).toBe('PENDING');
      expect(callArg.sentAt).toBeNull();
    });

    it('should derive recipientEmail from employeeId', async () => {
      mockRepo.create.mockResolvedValueOnce(makeNotification({ recipientId: 'emp-999' }));

      await service.notifyLeaveSubmitted('emp-999', 'lr-002');

      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.recipientEmail).toBe('emp-999@example.com');
    });

    it('should catch and handle repository failures without throwing', async () => {
      const error = new Error('Connection refused');
      mockRepo.create.mockRejectedValueOnce(error);

      await expect(
        service.notifyLeaveSubmitted('emp-001', 'lr-001'),
      ).resolves.toBeUndefined();

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should handle non-Error rejections gracefully', async () => {
      mockRepo.create.mockRejectedValueOnce('string error');

      await expect(
        service.notifyLeaveSubmitted('emp-001', 'lr-001'),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyLeaveStatusChange', () => {
    it('should persist a PENDING notification with status transition in body', async () => {
      const persisted = makeNotification({
        subject: 'Leave Request APPROVED',
        body: 'Your leave request lr-003 has transitioned from PENDING to APPROVED.',
      });
      mockRepo.create.mockResolvedValueOnce(persisted);

      await service.notifyLeaveStatusChange('emp-001', 'lr-003', 'PENDING', 'APPROVED');

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.recipientId).toBe('emp-001');
      expect(callArg.recipientEmail).toBe('emp-001@example.com');
      expect(callArg.subject).toBe('Leave Request APPROVED');
      expect(callArg.body).toContain('lr-003');
      expect(callArg.body).toContain('PENDING');
      expect(callArg.body).toContain('APPROVED');
      expect(callArg.status).toBe('PENDING');
      expect(callArg.sentAt).toBeNull();
    });

    it('should derive recipientEmail from employeeId', async () => {
      mockRepo.create.mockResolvedValueOnce(makeNotification({ recipientId: 'emp-777' }));

      await service.notifyLeaveStatusChange('emp-777', 'lr-004', 'PENDING', 'REJECTED');

      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.recipientEmail).toBe('emp-777@example.com');
    });

    it('should catch and handle repository failures without throwing', async () => {
      mockRepo.create.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(
        service.notifyLeaveStatusChange('emp-001', 'lr-003', 'PENDING', 'APPROVED'),
      ).resolves.toBeUndefined();

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should handle non-Error rejections gracefully', async () => {
      mockRepo.create.mockRejectedValueOnce(42);

      await expect(
        service.notifyLeaveStatusChange('emp-001', 'lr-003', 'PENDING', 'APPROVED'),
      ).resolves.toBeUndefined();
    });
  });
});
