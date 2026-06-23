import { NotificationController } from '../../../../src/modules/notification/notification.controller';
import { INotificationService } from '../../../../src/modules/notification/notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let mockService: jest.Mocked<INotificationService>;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockService = {
      getNotificationsForEmployee: jest.fn(),
      getNotification: jest.fn(),
      markAsRead: jest.fn(),
    } as any;
    controller = new NotificationController(mockService);
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    mockRequest = {
      params: {},
      query: {},
      user: { id: 'user1', employeeId: 'emp1' }
    };
  });

  describe('listNotifications', () => {
    it('should validate query params and return notifications', async () => {
      mockRequest.query = { status: 'sent', limit: '10', offset: '0' };
      const notifications = [{ id: '1' }];
      mockService.getNotificationsForEmployee.mockResolvedValue(notifications as any);

      await controller.listNotifications(mockRequest, mockReply);

      expect(mockService.getNotificationsForEmployee).toHaveBeenCalledWith('emp1', { status: 'sent', limit: 10, offset: 0 });
      expect(mockReply.send).toHaveBeenCalledWith(notifications);
    });
  });

  describe('getNotification', () => {
    it('should validate params and return notification', async () => {
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const notification = { id: '123e4567-e89b-12d3-a456-426614174000' };
      mockService.getNotification.mockResolvedValue(notification as any);

      await controller.getNotification(mockRequest, mockReply);

      expect(mockService.getNotification).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(mockReply.send).toHaveBeenCalledWith(notification);
    });

    it('should return 404 if notification not found', async () => {
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      mockService.getNotification.mockRejectedValue(new Error('Notification not found'));

      await controller.getNotification(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Notification not found' });
    });

    it('should return 400 for invalid UUID', async () => {
      mockRequest.params = { id: 'invalid-uuid' };

      await controller.getNotification(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
    });
  });

  describe('markAsRead', () => {
    it('should validate params and mark as read', async () => {
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const notification = { id: '123e4567-e89b-12d3-a456-426614174000' };
      mockService.markAsRead.mockResolvedValue(notification as any);

      await controller.markAsRead(mockRequest, mockReply);

      expect(mockService.markAsRead).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', 'emp1');
      expect(mockReply.send).toHaveBeenCalledWith(notification);
    });

    it('should return 403 if unauthorized', async () => {
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      mockService.markAsRead.mockRejectedValue(new Error('Unauthorized'));

      await controller.markAsRead(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });
});
