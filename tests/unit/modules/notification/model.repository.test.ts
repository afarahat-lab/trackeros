import { Notification } from '../../../../src/modules/notification/notification.model';
import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';

describe('Notification Model and Repository', () => {
  it('should define Notification interface with correct fields', () => {
    const notification: Notification = {
      id: '1',
      recipientId: 'emp1',
      senderId: null,
      type: 'leave_submitted',
      title: 'Leave Request Submitted',
      message: 'Your leave request has been submitted',
      metadata: null,
      isRead: false,
      createdAt: new Date(),
      readAt: null
    };
    
    expect(notification).toBeDefined();
    expect(notification.type).toBe('leave_submitted');
  });

  it('should define NotificationRepository interface with required methods', () => {
    const repository: NotificationRepository = {
      findById: async (id: string) => null,
      findByRecipientId: async (recipientId: string) => [],
      findUnreadByRecipientId: async (recipientId: string) => [],
      save: async (notification) => ({ ...notification, id: '1', createdAt: new Date(), updatedAt: new Date() }),
      markAsRead: async (id: string) => null
    };
    
    expect(repository).toBeDefined();
    expect(repository.findById).toBeDefined();
    expect(repository.findByRecipientId).toBeDefined();
    expect(repository.findUnreadByRecipientId).toBeDefined();
    expect(repository.save).toBeDefined();
    expect(repository.markAsRead).toBeDefined();
  });
});
