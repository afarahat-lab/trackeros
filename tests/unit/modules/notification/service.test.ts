import { NotificationService, NotificationServiceImpl } from '../../../../src/modules/notification/notification.service';
import { NotificationRepository } from '../../../../src/modules/notification/notification.repository';

describe('NotificationService', () => {
  let mockNotificationRepo: jest.Mocked<NotificationRepository>;
  let service: NotificationService;

  beforeEach(() => {
    mockNotificationRepo = {
      findById: jest.fn(),
      findByRecipientId: jest.fn(),
      findUnreadByRecipientId: jest.fn(),
      save: jest.fn(),
      markAsRead: jest.fn(),
    };
    service = new NotificationServiceImpl(mockNotificationRepo);
  });

  it('should be instantiated', () => {
    expect(service).toBeDefined();
  });

  it('should have createNotification method', () => {
    expect(service.createNotification).toBeDefined();
  });

  it('should have markAsRead method', () => {
    expect(service.markAsRead).toBeDefined();
  });

  it('should have getUnreadNotifications method', () => {
    expect(service.getUnreadNotifications).toBeDefined();
  });
});
