import { FastifyReply, FastifyRequest } from 'fastify';

import { AppError, UserRole } from '../../shared/types';
import type { ILeaveService } from './leave.model';

interface AuthUser {
  id?: string;
  role?: unknown;
}

interface SubmitLeaveBody {
  employeeId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

interface RejectLeaveBody {
  rejectionReason?: string;
}

interface LeaveRequestParams {
  id: string;
}

function sanitizeRole(value: unknown): UserRole {
  if (
    value === UserRole.EMPLOYEE ||
    value === UserRole.MANAGER ||
    value === UserRole.HR_ADMIN
  ) {
    return value;
  }
  return UserRole.EMPLOYEE;
}

function getUser(request: FastifyRequest): AuthUser {
  return (request as unknown as { user?: AuthUser }).user ?? {};
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(error.toResponse());
  }
  return reply.status(500).send({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR'
  });
}

function requireAuth(request: FastifyRequest, reply: FastifyReply): {
  actorId: string;
  role: UserRole;
} | null {
  const user = getUser(request);
  if (!user.id) {
    void reply.status(401).send({
      error: 'Authentication required',
      code: 'AUTHENTICATION_ERROR'
    });
    return null;
  }
  return { actorId: user.id, role: sanitizeRole(user.role) };
}

export class LeaveController {
  constructor(private readonly service: ILeaveService) {}

  async submit(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const auth = requireAuth(request, reply);
      if (!auth) {
        return reply;
      }
      const body = (request.body ?? {}) as SubmitLeaveBody;
      if (
        !body.employeeId ||
        !body.leaveTypeId ||
        !body.startDate ||
        !body.endDate
      ) {
        return reply.status(400).send({
          error: 'employeeId, leaveTypeId, startDate and endDate are required',
          code: 'VALIDATION_ERROR'
        });
      }
      const result = await this.service.submit(
        {
          employeeId: body.employeeId,
          leaveTypeId: body.leaveTypeId,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          reason: body.reason
        },
        auth.actorId,
        auth.role
      );
      return reply.status(201).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  }

  async approve(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const auth = requireAuth(request, reply);
      if (!auth) {
        return reply;
      }
      const params = request.params as LeaveRequestParams;
      const result = await this.service.approve(params.id, auth.actorId, auth.role);
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  }

  async reject(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const auth = requireAuth(request, reply);
      if (!auth) {
        return reply;
      }
      const params = request.params as LeaveRequestParams;
      const body = (request.body ?? {}) as RejectLeaveBody;
      const result = await this.service.reject(
        params.id,
        auth.actorId,
        auth.role,
        body.rejectionReason
      );
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  }

  async cancel(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const auth = requireAuth(request, reply);
      if (!auth) {
        return reply;
      }
      const params = request.params as LeaveRequestParams;
      const result = await this.service.cancel(params.id, auth.actorId, auth.role);
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  }
}
