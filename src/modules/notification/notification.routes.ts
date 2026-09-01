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

const createNotificationSchema = z.object({
  recipientId: z.string().min(1),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1),
  message: z.string().min(1),
  relatedEntityType: z.string().nullable(),
  relatedEntityId: z.string().nullable(),
});

const notificationError = {
  VALIDATION_ERROR: (message: string): { error: string; code: string } => ({
    error: message,
    code: 'VALIDATION_ERROR',
  }),
  NOT_FOUND: (message: string): { error: string; code: string } => ({
    error: message,
    code: 'NOT_FOUND',
  }),
  INTERNAL_ERROR: { error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
};

export async function notificationRoutes(fastify: FastifyInstance): Promise<void> {
  const notifications = new NotificationService(
    new PgNotificationRepository(),
    new UnitOfWork(),
  );

  fastify.post(
    '/notifications',
    { preHandler: requireRole(UserRole.HR_ADMIN) },
    async (request, reply) => {
      try {
        const parsed = createNotificationSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply
            .status(400)
            .send(notificationError.VALIDATION_ERROR('Invalid request body'));
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
        request.log.error(error);
        return reply.status(500).send(notificationError.INTERNAL_ERROR);
      }
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER) },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const notification = await notifications.markRead(id);
        return reply.status(200).send(notification);
      } catch (error) {
        if (error instanceof InvalidNotificationTransitionError) {
          return reply
            .status(404)
            .send(notificationError.NOT_FOUND(error.message));
        }
        request.log.error(error);
        return reply.status(500).send(notificationError.INTERNAL_ERROR);
      }
    },
  );

  fastify.get<{ Params: { recipientId: string } }>(
    '/notifications/recipient/:recipientId',
    { preHandler: requireRole(UserRole.HR_ADMIN, UserRole.MANAGER) },
    async (request, reply) => {
      try {
        const { recipientId } = request.params;
        const result = await notifications.findByRecipient(recipientId);
        return reply.status(200).send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send(notificationError.INTERNAL_ERROR);
      }
    },
  );
}
