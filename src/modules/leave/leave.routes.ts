import type { FastifyInstance } from 'fastify';

import { LeaveController } from './leave.controller';

const submitBodySchema = {
  type: 'object',
  required: ['employeeId', 'leaveTypeId', 'startDate', 'endDate'],
  properties: {
    employeeId: { type: 'string' },
    leaveTypeId: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    reason: { type: 'string' }
  },
  additionalProperties: false
} as const;

const rejectBodySchema = {
  type: 'object',
  required: ['rejectionReason'],
  properties: {
    rejectionReason: { type: 'string' }
  },
  additionalProperties: false
} as const;

const paramsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' }
  }
} as const;

export async function leaveRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new LeaveController();

  fastify.post(
    '/leave-requests',
    { schema: { body: submitBodySchema } },
    (request, reply) => controller.submit(request, reply)
  );

  fastify.post(
    '/leave-requests/:id/approve',
    { schema: { params: paramsSchema } },
    (request, reply) => controller.approve(request, reply)
  );

  fastify.post(
    '/leave-requests/:id/reject',
    { schema: { body: rejectBodySchema, params: paramsSchema } },
    (request, reply) => controller.reject(request, reply)
  );

  fastify.post(
    '/leave-requests/:id/cancel',
    { schema: { params: paramsSchema } },
    (request, reply) => controller.cancel(request, reply)
  );
}
