import { NotificationService } from '../../../../src/modules/notification/notification.service';
import { INotificationRepository } from '../../../../src/modules/notification/notification.repository';
import { IAuditService } from '../../../../src/modules/audit/audit.service';
import { NotificationStatus, AuditAction } from '../../../../src/modules/notification/notification.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepository: jest.Mocked<INotificationRepository>;
  let mockAuditService: jest.Mocked<IAuditService>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      markAsSent: jest.fn(),
      findByRecipient: jest.fn(),
      markAsRead: jest.fn(),
    } as any;
    mockAuditService = {
      recordAction: jest.fn(),
    } as any;
    service = new NotificationService(mockRepository, mockAuditService);
  });

  describe('createNotification', () => {
    it('should create notification and log audit', async () => {
      const dto = { recipientId: 'emp1', type: 'email', title: 'Test', message: 'Msg' };
      const created = { id: '1', ...dto, status: NotificationStatus.PENDING };
      mockRepository.create.mockResolvedValue(created as any);

      const result = await service.createNotification(dto as any);

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'emp1', status: NotificationStatus.PENDING }));
      expect(mockAuditService.recordAction).toHaveBeenCalledWith('Notification', '1', AuditAction.CREATE, null, { newValues: created });
      expect(result).toEqual(created);
    });
  });

  describe('sendNotification', () => {
    it('should mark as sent and log audit', async () => {
      const original = { id: '1', status: NotificationStatus.PENDING };
      const updated = { id: '1', status: NotificationStatus.SENT };
      mockRepository.findById.mockResolvedValueOnce(original as any).mockResolvedValueOnce(updated as any);

      const result = await service.sendNotification('1');

      expect(mockRepository.markAsSent).toHaveBeenCalledWith('1');
      expect(mockAuditService.recordAction).toHaveBeenCalledWith('Notification', '1', AuditAction.UPDATE, null, { oldValues: original, newValues: updated });
      expect(result).toEqual(updated);
    });

    it('should throw error if notification not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.sendNotification('1')).rejects.toThrow('Notification not found');
    });
  });

  describe('getNotificationsForEmployee', () => {
    it('should delegate to repository', async () => {
      const notifications = [{ id: '1' }];
      mockRepository.findByRecipient.mockResolvedValue(notifications as any);

      const result = await service.getNotificationsForEmployee('emp1', { limit: 10 });

      expect(mockRepository.findByRecipient).toHaveBeenCalledWith('emp1', { limit: 10 });
      expect(result).toEqual(notifications);
    });
  });

  describe('markAsRead', () => {
    it('should verify ownership, mark as read, and log audit', async () => {
      const original = { id: '1', recipientId: 'emp1', status: NotificationStatus.SENT };
      const updated = { id: '1', recipientId: 'emp1', status: NotificationStatus.READ };
      mockRepository.findById.mockResolvedValueOnce(original as any).mockResolvedValueOnce(updated as any);

      const result = await service.markAsRead('1', 'emp1');

      expect(mockRepository.markAsRead).toHaveBeenCalledWith('1');
      expect(mockAuditService.recordAction).toHaveBeenCalledWith('Notification', '1', AuditAction.UPDATE, 'emp1', { oldValues: original, newValues: updated });
      expect(result).toEqual(updated);
    });

    it('should throw error if notification not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.markAsRead('1', 'emp1')).rejects.toThrow('Notification not found');
    });

    it('should throw error if unauthorized', async () => {
      mockRepository.findById.mockResolvedValue({ id: '1', recipientId: 'emp2' } as any);
      await expect(service.markAsRead('1', 'emp1')).rejects.toThrow('Unauthorized');
    });
  });

  describe('getNotification', () => {
    it('should delegate to repository', async () => {
      const notification = { id: '1' };
      mockRepository.findById.mockResolvedValue(notification as any);

      const result = await service.getNotification('1');

      expect(mockRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(notification);
    });

    it('should throw error if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.getNotification('1')).rejects.toThrow('Notification not found');
    });
  });
});
