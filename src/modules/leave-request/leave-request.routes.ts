import { FastifyInstance } from 'fastify';
import { LeaveRequestController } from './leave-request.controller';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestRepository } from './leave-request.repository';
import { LeaveBalanceRepository } from '../leave-balance';
import { LeavePolicyRepository } from '../leave-policy';
import { EmployeeRepository } from '../employee';
import { CreateLeaveRequestDto, LeaveRequestQueryParams } from '../../shared/types';

function mapErrorToHttpStatus(code: string): number {
  switch (code) {
    case 'EMPLOYEE_NOT_FOUND':
    case 'POLICY_NOT_FOUND':
    case 'REQUEST_NOT_FOUND':
    case 'BALANCE_NOT_FOUND':
      return 404;
    case 'INVALID_DATE_RANGE':
    case 'MINIMUM_NOTICE_VIOLATION':
      return 400;
    case 'INVALID_STATE_TRANSITION':
    case 'INSUFFICIENT_BALANCE':
    case 'BALANCE_CLOSED':
    case 'POLICY_INACTIVE':
      return 409;
    case 'NOT_MANAGER':
      return 403;
    default:
      return 500;
  }
}

function isServiceError(error: unknown): error is { error: string; code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'code' in error &&
    typeof (error as Record<string, unknown>).error === 'string' &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

export async function leaveRequestRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new LeaveRequestController(
    new LeaveRequestService(
      new LeaveRequestRepository(),
      new LeaveBalanceRepository(),
      new LeavePolicyRepository(),
      new EmployeeRepository(),
    ),
  );

  fastify.post<{ Body: CreateLeaveRequestDto }>('/leave-requests', async (request, reply) => {
    try {
      const result = await controller.createDraft(request.body);
      return reply.status(201).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      if (isServiceError(error)) {
        return reply.status(mapErrorToHttpStatus(error.code)).send({ error: error.error, code: error.code });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post<{ Params: { id: string } }>('/leave-requests/:id/submit', async (request, reply) => {
    try {
      const result = await controller.submit(request.params.id);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      if (isServiceError(error)) {
        return reply.status(mapErrorToHttpStatus(error.code)).send({ error: error.error, code: error.code });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post<{ Params: { id: string }; Body: { approverId: string } }>(
    '/leave-requests/:id/approve',
    async (request, reply) => {
      try {
        const result = await controller.approve(request.params.id, request.body.approverId);
        return reply.status(200).send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (isServiceError(error)) {
          return reply.status(mapErrorToHttpStatus(error.code)).send({ error: error.error, code: error.code });
        }
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  fastify.post<{ Params: { id: string }; Body: { approverId: string } }>(
    '/leave-requests/:id/reject',
    async (request, reply) => {
      try {
        const result = await controller.reject(request.params.id, request.body.approverId);
        return reply.status(200).send(result);
      } catch (error: unknown) {
        request.log.error(error);
        if (isServiceError(error)) {
          return reply.status(mapErrorToHttpStatus(error.code)).send({ error: error.error, code: error.code });
        }
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  fastify.post<{ Params: { id: string } }>('/leave-requests/:id/cancel', async (request, reply) => {
    try {
      const result = await controller.cancel(request.params.id);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      if (isServiceError(error)) {
        return reply.status(mapErrorToHttpStatus(error.code)).send({ error: error.error, code: error.code });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get<{ Params: { employeeId: string } }>(
    '/leave-requests/employee/:employeeId',
    async (request, reply) => {
      try {
        const results = await controller.findByEmployeeId(request.params.employeeId);
        return reply.status(200).send(results);
      } catch (error: unknown) {
        request.log.error(error);
        if (isServiceError(error)) {
          return reply.status(mapErrorToHttpStatus(error.code)).send({ error: error.error, code: error.code });
        }
        return reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  );

  fastify.get<{ Params: { id: string } }>('/leave-requests/:id', async (request, reply) => {
    try {
      const result = await controller.findById(request.params.id);
      if (!result) {
        return reply.status(404).send({ error: 'Leave request not found', code: 'REQUEST_NOT_FOUND' });
      }
      return reply.status(200).send(result);
    } catch (error: unknown) {
      request.log.error(error);
      if (isServiceError(error)) {
        return reply.status(mapErrorToHttpStatus(error.code)).send({ error: error.error, code: error.code });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get<{ Querystring: LeaveRequestQueryParams }>('/leave-requests', async (request, reply) => {
    try {
      const params: LeaveRequestQueryParams = {
        employeeId: request.query.employeeId,
        status: request.query.status,
        leavePolicyId: request.query.leavePolicyId,
        startDateFrom: request.query.startDateFrom,
        startDateTo: request.query.startDateTo,
      };
      const results = await controller.query(params);
      return reply.status(200).send(results);
    } catch (error: unknown) {
      request.log.error(error);
      if (isServiceError(error)) {
        return reply.status(mapErrorToHttpStatus(error.code)).send({ error: error.error, code: error.code });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}
