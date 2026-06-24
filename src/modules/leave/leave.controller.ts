import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ILeaveService } from './leave.service';
import { LeaveRequestStatus } from '../../shared/types/index';

export interface AuthenticatedRequest extends FastifyRequest {
  user: { employeeId: string; role: string };
}

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const submitLeaveRequestSchema = z.object({
  leave_type_id: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string().optional()
});

const rejectLeaveRequestSchema = z.object({
  reason: z.string()
});

const listLeaveRequestsSchema = z.object({
  employee_id: z.string().optional(),
  status: z.nativeEnum(LeaveRequestStatus).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

const handleError = (error: unknown, reply: FastifyReply) => {
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ message: 'Validation error', errors: error.errors });
  }
  if (error instanceof Error) {
    if (error.message.includes('not active')) {
      return reply.code(403).send({ message: error.message });
    }
    if (error.message.includes('not found')) {
      return reply.code(404).send({ message: error.message });
    }
    return reply.code(400).send({ message: error.message });
  }
  return reply.code(500).send({ message: 'Internal server error' });
};

export const submitLeaveRequestHandler = (leaveService: ILeaveService) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const body = submitLeaveRequestSchema.parse(request.body);
      
      if (!dateRegex.test(body.start_date) || !dateRegex.test(body.end_date)) {
        return reply.code(400).send({ message: 'Validation error', errors: [{ message: 'Invalid date format' }] });
      }

      const result = await leaveService.submitLeaveRequest(
        {
          employeeId: request.user.employeeId,
          leaveTypeId: body.leave_type_id,
          startDate: new Date(body.start_date),
          endDate: new Date(body.end_date),
          reason: body.reason
        },
        request.user.employeeId
      );
      return reply.code(201).send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  };
};

export const approveLeaveRequestHandler = (leaveService: ILeaveService) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await leaveService.approveLeaveRequest(id, request.user.employeeId);
      return reply.code(200).send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  };
};

export const rejectLeaveRequestHandler = (leaveService: ILeaveService) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      rejectLeaveRequestSchema.parse(request.body);
      const result = await leaveService.rejectLeaveRequest(id, request.user.employeeId);
      return reply.code(200).send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  };
};

export const cancelLeaveRequestHandler = (leaveService: ILeaveService) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await leaveService.cancelLeaveRequest(id, request.user.employeeId);
      return reply.code(200).send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  };
};

export const getLeaveRequestHandler = (leaveService: ILeaveService) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await leaveService.getLeaveRequest(id);
      if (!result) {
        return reply.code(404).send({ message: 'Leave request not found' });
      }
      return reply.code(200).send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  };
};

export const listLeaveRequestsHandler = (leaveService: ILeaveService) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const query = listLeaveRequestsSchema.parse(request.query);
      
      if (query.start_date && !dateRegex.test(query.start_date)) {
        return reply.code(400).send({ message: 'Validation error', errors: [{ message: 'Invalid start_date format' }] });
      }
      if (query.end_date && !dateRegex.test(query.end_date)) {
        return reply.code(400).send({ message: 'Validation error', errors: [{ message: 'Invalid end_date format' }] });
      }

      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;

      if (isNaN(page) || page < 1) {
        return reply.code(400).send({ message: 'Validation error', errors: [{ message: 'Invalid page' }] });
      }
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return reply.code(400).send({ message: 'Validation error', errors: [{ message: 'Invalid limit' }] });
      }

      const result = await leaveService.listLeaveRequests({
        employeeId: query.employee_id,
        status: query.status,
        startDate: query.start_date ? new Date(query.start_date) : undefined,
        endDate: query.end_date ? new Date(query.end_date) : undefined,
        page,
        limit
      });
      return reply.code(200).send(result);
    } catch (error) {
      return handleError(error, reply);
    }
  };
};
