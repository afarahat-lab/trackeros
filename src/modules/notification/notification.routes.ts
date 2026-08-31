import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UnitOfWork } from '../../shared/db/unit-of-work.impl';
import { requireRole } from '../../shared/http/require-role';
import { NotificationType, UserRole } from '../../shared/types';
import {
  CreateNotificationInput,
  InvalidNotificationTransitionError,
} from './notification.model';
import { PgNotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

const notificationTypeSchema = z.enum([
  NotificationType.LEAVE_REQUEST_CREATED,
  NotificationType.LEAVE_REQUEST_APPROVED,
  NotificationType.LEAVE_REQUEST_REJECTED,
  NotificationType.LEAVE_REQUEST_CANCELLED,
  NotificationType.LEAVE_BALANCE_LOW,
  NotificationType.LEAVE_BALANCE_EXPIRING,
]);

const createNotificationSchema = z.object({
  recipientId: z.string().min(1),
  type: notificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  relatedEntityType: z.string().nullable(),
  relatedEntityId: z.string().nullable(),
});

export async function notificationRoutes(fastify: FastifyInstance): Promise<void> {
  const notifications = new NotificationService(
    new PgNotificationRepository(),
    new UnitOfWork(),
  );

  fastify.post(
    '/notifications',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER) },
    async (request, reply) => {
      try {
        const parsed = createNotificationSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send({ error: 'Invalid request body', code: 'VALIDATION_ERROR' });
        }
        const input: CreateNotificationInput = {
          recipientId: parsed.data.recipientId,
          type: parsed.data.type,
          title: parsed.data.title,
          message: parsed.data.message,
          relatedEntityType: parsed.data.relatedEntityType,
          relatedEntityId: parsed.data.relatedEntityId,
        };
        const notification = await notifications.create(input);
        return reply.status(201).send(notification);
      } catch (error) {
        if (error instanceof InvalidNotificationTransitionError) {
          return reply
            .status(400)
            .send({ error: error.message, code: 'VALIDATION_ERROR' });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE) },
    async (request, reply) => {
      try {
        const notification = await notifications.markRead(request.params.id);
        return reply.status(200).send(notification);
      } catch (error) {
        if (error instanceof InvalidNotificationTransitionError) {
          return reply
            .status(400)
            .send({ error: error.message, code: 'VALIDATION_ERROR' });
        }
        request.log.error(error);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );

  fastify.get<{ Querystring: { recipientId?: string } }>(
    '/notifications',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE) },
    async (request, reply) => {
      try {
        const { recipientId } = request.query;
        if (!recipientId) {
          return reply
            .status(400)
            .send({ error: 'recipientId query parameter is required', code: 'VALIDATION_ERROR' });
        }
        const result = await notifications.findByRecipient(recipientId);
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply
          .status(500)
          .send({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' });
      }
    },
  );
}
