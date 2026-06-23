import { FastifyInstance } from 'fastify';
import { NotificationController } from './notification.controller';

export function notificationRoutes(app: FastifyInstance, notificationController: NotificationController): void {
  app.get('/notifications', notificationController.listNotifications);
  app.get('/notifications/:id', notificationController.getNotification);
  (app as any).patch('/notifications/:id/read', notificationController.markAsRead);
}
