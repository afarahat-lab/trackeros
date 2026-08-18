
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ILeaveRequestService } from './leave-request.service';
import { LeaveStatus } from 'shared/types';

const createSchema = z.object({
  employeeId: z.string().min(1),
  leavePolicyId: z.string().min(1),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'startDate must be a valid date string',
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'endDate must be a valid date string',
  }),
  reason: z.string().optional(),
});

const updateSchema = z.object({
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'startDate must be a valid date string',
    })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'endDate must be a valid date string',
    })
    .optional(),
  reason: z.string().optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

const approveRejectBodySchema = z.object({
  approverId: z.string().min(1),
});

const cancelBodySchema = z.object({
  cancelledBy: z.string().min(1),
});

const querySchema = z.object({
  employeeId: z.string().optional(),
  status: z.nativeEnum(LeaveStatus).optional(),
  leavePolicyId: z.string().optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'startDate must be a valid date string',
    })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'endDate must be a valid date string',
    })
    .optional(),
});

export class LeaveRequestController {
  constructor(private readonly leaveRequestService: ILeaveRequestService) {}

  createLeaveRequest = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parsed.error.issues,
      });
    }

    const dto = {
      employeeId: parsed.data.employeeId,
      leavePolicyId: parsed.data.leavePolicyId,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      reason: parsed.data.reason,
    };

    const result = await this.leaveRequestService.create(dto);
    return reply.status(201).send(result);
  };

  submitLeaveRequest = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const paramsParsed = idParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.issues,
      });
    }

    const result = await this.leaveRequestService.submit(paramsParsed.data.id);
    return reply.status(200).send(result);
  };

  approveLeaveRequest = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const paramsParsed = idParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.issues,
      });
    }

    const bodyParsed = approveRejectBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: bodyParsed.error.issues,
      });
    }

    const result = await this.leaveRequestService.approve(
      paramsParsed.data.id,
      bodyParsed.data.approverId,
    );
    return reply.status(200).send(result);
  };

  rejectLeaveRequest = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const paramsParsed = idParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.issues,
      });
    }

    const bodyParsed = approveRejectBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: bodyParsed.error.issues,
      });
    }

    const result = await this.leaveRequestService.reject(
      paramsParsed.data.id,
      bodyParsed.data.approverId,
    );
    return reply.status(200).send(result);
  };

  cancelLeaveRequest = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const paramsParsed = idParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.issues,
      });
    }

    const bodyParsed = cancelBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: bodyParsed.error.issues,
      });
    }

    const result = await this.leaveRequestService.cancel(
      paramsParsed.data.id,
      bodyParsed.data.cancelledBy,
    );
    return reply.status(200).send(result);
  };

  updateLeaveRequest = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const paramsParsed = idParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.issues,
      });
    }

    const bodyParsed = updateSchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: bodyParsed.error.issues,
      });
    }

    const dto: {
      startDate?: Date;
      endDate?: Date;
      reason?: string;
    } = {};

    if (bodyParsed.data.startDate) {
      dto.startDate = new Date(bodyParsed.data.startDate);
    }
    if (bodyParsed.data.endDate) {
      dto.endDate = new Date(bodyParsed.data.endDate);
    }
    if (bodyParsed.data.reason !== undefined) {
      dto.reason = bodyParsed.data.reason;
    }

    const result = await this.leaveRequestService.update(paramsParsed.data.id, dto);
    return reply.status(200).send(result);
  };

  getLeaveRequest = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const paramsParsed = idParamsSchema.safeParse(request.params);
    if (!paramsParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: paramsParsed.error.issues,
      });
    }

    const result = await this.leaveRequestService.getById(paramsParsed.data.id);
    return reply.status(200).send(result);
  };

  queryLeaveRequests = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const queryParsed = querySchema.safeParse(request.query);
    if (!queryParsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: queryParsed.error.issues,
      });
    }

    const params: {
      employeeId?: string;
      status?: LeaveStatus;
      leavePolicyId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (queryParsed.data.employeeId) {
      params.employeeId = queryParsed.data.employeeId;
    }
    if (queryParsed.data.status) {
      params.status = queryParsed.data.status;
    }
    if (queryParsed.data.leavePolicyId) {
      params.leavePolicyId = queryParsed.data.leavePolicyId;
    }
    if (queryParsed.data.startDate) {
      params.startDate = new Date(queryParsed.data.startDate);
    }
    if (queryParsed.data.endDate) {
      params.endDate = new Date(queryParsed.data.endDate);
    }

    const result = await this.leaveRequestService.query(params);
    return reply.status(200).send(result);
  };
}
