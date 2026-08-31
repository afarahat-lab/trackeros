import type { FastifyReply, FastifyRequest } from 'fastify';

import { UserRole } from '../../shared/types';
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError
} from '../../shared/types/errors';

import { LeaveService } from './leave.service';

const USER_ID_HEADER = 'x-user-id';
const USER_ROLE_HEADER = 'x-user-role';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

interface SubmitLeaveBody {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

interface RejectLeaveBody {
  rejectionReason: string;
}

interface LeaveParams {
  id: string;
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === UserRole.EMPLOYEE ||
    value === UserRole.MANAGER ||
    value === UserRole.HR_ADMIN
  );
}

function getAuthenticatedUser(request: FastifyRequest): AuthenticatedUser {
  const id = request.headers[USER_ID_HEADER];
  const role = request.headers[USER_ROLE_HEADER];
  if (typeof id !== 'string' || id.length === 0) {
    throw new AuthenticationError('Authentication required');
  }
  if (typeof role !== 'string' || !isUserRole(role)) {
    throw new AuthenticationError('Authentication required');
  }
  return { id, role };
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

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Invalid date: ${value}`);
  }
  return date;
}

export class LeaveController {
  private readonly service: LeaveService;

  constructor(service: LeaveService = new LeaveService()) {
    this.service = service;
  }

  async submit(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const user = getAuthenticatedUser(request);
      if (user.role !== UserRole.EMPLOYEE) {
        throw new AuthorizationError('Only employees may submit leave requests');
      }
      const body = request.body as SubmitLeaveBody;
      const startDate = parseDate(body.startDate);
      const endDate = parseDate(body.endDate);
      const result = await this.service.submit(
        body.employeeId,
        body.leaveTypeId,
        startDate,
        endDate,
        body.reason,
        user.id
      );
      return reply.status(201).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  }

  async approve(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const user = getAuthenticatedUser(request);
      if (
        user.role !== UserRole.MANAGER &&
        user.role !== UserRole.HR_ADMIN
      ) {
        throw new AuthorizationError(
          'Only managers or HR admins may approve leave requests'
        );
      }
      const { id } = request.params as LeaveParams;
      const result = await this.service.approve(id, user.id);
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  }

  async reject(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const user = getAuthenticatedUser(request);
      if (
        user.role !== UserRole.MANAGER &&
        user.role !== UserRole.HR_ADMIN
      ) {
        throw new AuthorizationError(
          'Only managers or HR admins may reject leave requests'
        );
      }
      const { id } = request.params as LeaveParams;
      const body = request.body as RejectLeaveBody;
      const result = await this.service.reject(id, user.id, body.rejectionReason);
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  }

  async cancel(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const user = getAuthenticatedUser(request);
      if (
        user.role !== UserRole.EMPLOYEE &&
        user.role !== UserRole.HR_ADMIN
      ) {
        throw new AuthorizationError(
          'Only employees or HR admins may cancel leave requests'
        );
      }
      const { id } = request.params as LeaveParams;
      const result = await this.service.cancel(id, user.id, user.role);
      return reply.status(200).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  }
}
