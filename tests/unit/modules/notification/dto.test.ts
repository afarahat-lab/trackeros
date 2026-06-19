import { CreateNotificationDto, MarkAsReadDto, NotificationQueryDto } from '../../../../src/modules/notification/notification.dto';

describe('Notification DTOs', () => {
  describe('CreateNotificationDto', () => {
    it('should accept valid required fields', () => {
      const dto: CreateNotificationDto = {
        recipientId: 'emp-001',
        type: 'leave_submitted',
        title: 'Leave Request Submitted',
        message: 'Your leave request has been submitted.',
      };
      expect(dto.recipientId).toBe('emp-001');
      expect(dto.type).toBe('leave_submitted');
      expect(dto.title).toBe('Leave Request Submitted');
      expect(dto.message).toBe('Your leave request has been submitted.');
      expect(dto.senderId).toBeUndefined();
      expect(dto.metadata).toBeUndefined();
    });

    it('should accept optional senderId and metadata', () => {
      const dto: CreateNotificationDto = {
        recipientId: 'emp-001',
        senderId: 'mgr-001',
        type: 'leave_approved',
        title: 'Leave Approved',
        message: 'Your leave has been approved.',
        metadata: { requestId: 'req-001' },
      };
      expect(dto.senderId).toBe('mgr-001');
      expect(dto.metadata).toEqual({ requestId: 'req-001' });
    });

    it('should accept all notification type values', () => {
      const types: Array<'leave_submitted' | 'leave_approved' | 'leave_rejected' | 'balance_low' | 'system_alert'> = [
        'leave_submitted',
        'leave_approved',
        'leave_rejected',
        'balance_low',
        'system_alert',
      ];
      types.forEach((type) => {
        const dto: CreateNotificationDto = {
          recipientId: 'emp-001',
          type,
          title: 'Test',
          message: 'Test message',
        };
        expect(dto.type).toBe(type);
      });
    });
  });

  describe('MarkAsReadDto', () => {
    it('should accept required fields', () => {
      const dto: MarkAsReadDto = {
        notificationId: 'notif-001',
        recipientId: 'emp-001',
      };
      expect(dto.notificationId).toBe('notif-001');
      expect(dto.recipientId).toBe('emp-001');
    });
  });

  describe('NotificationQueryDto', () => {
    it('should accept all optional fields', () => {
      const dto: NotificationQueryDto = {
        recipientId: 'emp-001',
      };
      expect(dto.recipientId).toBe('emp-001');
      expect(dto.isRead).toBeUndefined();
      expect(dto.type).toBeUndefined();
    });

    it('should accept all fields', () => {
      const dto: NotificationQueryDto = {
        recipientId: 'emp-001',
        isRead: false,
        type: 'leave_submitted',
      };
      expect(dto.isRead).toBe(false);
      expect(dto.type).toBe('leave_submitted');
    });
  });
});
