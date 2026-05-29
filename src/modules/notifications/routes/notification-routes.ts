import { FastifyInstance } from 'fastify';
import { NotificationService } from '../service/notification-service';
import { NotificationSchema } from '../domain/notification';
import { auditLog } from '../../../shared/utils/audit-log';
import { requireRole } from '../../../shared/auth/rbac';

/**
 * Registers notification routes.
 * @param app - The Fastify instance.
 * @param service - The notification service.
 */
export function registerNotificationRoutes(app: FastifyInstance, service: NotificationService): void {
  app.post('/api/v1/notifications', {
    preHandler: requireRole('operator'),
    schema: { body: NotificationSchema }
  }, async (request, reply) => {
    const notificationData = request.body;
    const notification = await service.createNotification(notificationData);
    await auditLog.append({ action: 'create', entity: 'Notification', data: notification });
    reply.send(notification);
  });

  app.get('/api/v1/notifications', {
    preHandler: requireRole('operator')
  }, async (request, reply) => {
    const notifications = await service.getAllNotifications();
    reply.send({ notifications });
  });
}
