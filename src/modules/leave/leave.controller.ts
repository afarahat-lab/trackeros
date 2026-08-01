import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateLeaveRequestDto, LeaveRequestQueryParams } from '../../shared/types';
import { ILeaveService } from './leave.service.interface';

export class LeaveController {
  constructor(private readonly leaveService: ILeaveService) {}

  async submit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as Record<string, unknown>;

    const errors: string[] = [];

    if (typeof body?.employeeId !== 'string' || body.employeeId.trim() === '') {
      errors.push('employeeId is required and must be a non-empty string');
    }
    if (typeof body?.policyId !== 'string' || body.policyId.trim() === '') {
      errors.push('policyId is required and must be a non-empty string');
    }
    if (body?.startDate === undefined || body?.startDate === null || typeof body?.startDate !== 'string') {
      errors.push('startDate is required and must be a valid date string');
    }
    if (body?.endDate === undefined || body?.endDate === null || typeof body?.endDate !== 'string') {
      errors.push('endDate is required and must be a valid date string');
    }

    if (errors.length > 0) {
      return reply.status(400).send({ errors });
    }

    const startDate = new Date(body.startDate as string);
    const endDate = new Date(body.endDate as string);

    if (isNaN(startDate.getTime())) {
      errors.push('startDate is not a valid date');
    }
    if (isNaN(endDate.getTime())) {
      errors.push('endDate is not a valid date');
    }
    if (errors.length > 0) {
      return reply.status(400).send({ errors });
    }

    const dto: CreateLeaveRequestDto = {
      employeeId: body.employeeId as string,
      policyId: body.policyId as string,
      startDate,
      endDate,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
    };

    try {
      const result = await this.leaveService.submitLeaveRequest(dto);
      return reply.status(201).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'InsufficientBalanceError') {
          return reply.status(409).send({ error: error.message });
        }
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }

  async approve(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as Record<string, unknown>;
    const requestId = params.requestId as string;

    if (!requestId) {
      return reply.status(400).send({ error: 'requestId is required' });
    }

    const authContext = request.user as Record<string, unknown> | undefined;
    const approverId = (authContext?.id as string) ?? 'system';
    const approverRole = (authContext?.role as string) ?? '';

    if (approverRole !== 'manager' && approverRole !== 'hr_admin') {
      return reply.status(403).send({ error: 'Forbidden: only managers and HR admins can approve requests' });
    }

    try {
      const result = await this.leaveService.approveLeaveRequest(requestId, approverId);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }

  async reject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as Record<string, unknown>;
    const requestId = params.requestId as string;

    if (!requestId) {
      return reply.status(400).send({ error: 'requestId is required' });
    }

    const body = request.body as Record<string, unknown>;
    const authContext = request.user as Record<string, unknown> | undefined;
    const approverId = (authContext?.id as string) ?? 'system';
    const approverRole = (authContext?.role as string) ?? '';
    const reason = typeof body?.reason === 'string' ? body.reason : '';

    if (approverRole !== 'manager' && approverRole !== 'hr_admin') {
      return reply.status(403).send({ error: 'Forbidden: only managers and HR admins can reject requests' });
    }

    if (!reason.trim()) {
      return reply.status(400).send({ error: 'reason is required' });
    }

    try {
      const result = await this.leaveService.rejectLeaveRequest(requestId, approverId, reason);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }

  async cancel(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as Record<string, unknown>;
    const requestId = params.requestId as string;

    if (!requestId) {
      return reply.status(400).send({ error: 'requestId is required' });
    }

    const authContext = request.user as Record<string, unknown> | undefined;
    const employeeId = (authContext?.id as string) ?? 'system';

    try {
      const result = await this.leaveService.cancelLeaveRequest(requestId, employeeId);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('Employee mismatch')) {
          return reply.status(403).send({ error: error.message });
        }
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as Record<string, unknown>;
    const requestId = params.requestId as string;

    if (!requestId) {
      return reply.status(400).send({ error: 'requestId is required' });
    }

    try {
      const result = await this.leaveService.getLeaveRequest(requestId);
      if (!result) {
        return reply.status(404).send({ error: 'Leave request not found' });
      }
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }

  async getByEmployee(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as Record<string, unknown>;
    const employeeId = params.employeeId as string;

    if (!employeeId) {
      return reply.status(400).send({ error: 'employeeId is required' });
    }

    const query = request.query as Record<string, unknown>;

    const queryParams: LeaveRequestQueryParams = {};

    if (typeof query.status === 'string') {
      queryParams.status = query.status as LeaveRequestQueryParams['status'];
    }
    if (typeof query.policyId === 'string') {
      queryParams.policyId = query.policyId;
    }
    if (typeof query.startDateFrom === 'string') {
      queryParams.startDateFrom = new Date(query.startDateFrom);
    }
    if (typeof query.startDateTo === 'string') {
      queryParams.startDateTo = new Date(query.startDateTo);
    }
    if (typeof query.endDateFrom === 'string') {
      queryParams.endDateFrom = new Date(query.endDateFrom);
    }
    if (typeof query.endDateTo === 'string') {
      queryParams.endDateTo = new Date(query.endDateTo);
    }
    if (typeof query.limit === 'string') {
      const parsed = parseInt(query.limit, 10);
      if (!isNaN(parsed)) {
        queryParams.limit = parsed;
      }
    }
    if (typeof query.offset === 'string') {
      const parsed = parseInt(query.offset, 10);
      if (!isNaN(parsed)) {
        queryParams.offset = parsed;
      }
    }

    try {
      const result = await this.leaveService.getEmployeeLeaveRequests(employeeId, queryParams);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
}
