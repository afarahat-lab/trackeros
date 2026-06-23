import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { INotificationService } from './notification.service';

export class NotificationController {
  constructor(private readonly notificationService: INotificationService) {}

  listNotifications = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const querySchema = z.object({
        status: z.string().optional(),
        limit: z.string().optional(),
        offset: z.string().optional()
      });
      const parsed = querySchema.parse(request.query);
      const options = {
        status: parsed.status,
        limit: parsed.limit ? Number(parsed.limit) : undefined,
        offset: parsed.offset ? Number(parsed.offset) : undefined
      };
      const employeeId = (request.user as any).employeeId || (request.user as any).id;
      
      const notifications = await this.notificationService.getNotificationsForEmployee(employeeId, options);
      return reply.send(notifications);
    } catch (error: any) {
      return reply.status(error instanceof z.ZodError ? 400 : 500).send({ error: error.message });
    }
  };

  getNotification = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      
      const notification = await this.notificationService.getNotification(id);
      return reply.send(notification);
    } catch (error: any) {
      const status = error.message === 'Notification not found' ? 404 : (error instanceof z.ZodError ? 400 : 500);
      return reply.status(status).send({ error: error.message });
    }
  };

  markAsRead = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const employeeId = (request.user as any).employeeId || (request.user as any).id;
      
      const notification = await this.notificationService.markAsRead(id, employeeId);
      return reply.send(notification);
    } catch (error: any) {
      const status = error.message === 'Notification not found' ? 404 : (error.message === 'Unauthorized' ? 403 : (error instanceof z.ZodError ? 400 : 500));
      return reply.status(status).send({ error: error.message });
    }
  };
}
