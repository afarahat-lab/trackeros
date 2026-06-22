import { FastifyRequest, FastifyReply } from 'fastify';
import { SubmitLeaveDto, ApproveLeaveDto, RejectLeaveDto, LeaveHistoryQueryDto } from './leave.dto';
import { ILeaveManagementService, UserContext } from '../leave-management/leave-management.service.interface';

export class LeaveController {
  constructor(private leaveManagementService: ILeaveManagementService) {}

  private getUserContext(request: FastifyRequest): UserContext {
    if (!request.user) {
      throw new Error('User not authenticated');
    }
    return {
      id: request.user.employeeId,
      role: request.user.role
    };
  }

  async submitLeave(request: FastifyRequest<{ Body: SubmitLeaveDto }>, reply: FastifyReply) {
    try {
      const user = this.getUserContext(request);
      const dto = {
        employeeId: user.id,
        leaveTypeId: request.body.leaveTypeId,
        startDate: new Date(request.body.startDate),
        endDate: new Date(request.body.endDate),
        reason: request.body.reason
      };
      const result = await this.leaveManagementService.submitLeaveRequest(dto, user);
      return reply.status(201).send(result);
    } catch (error: any) {
      return this.handleError(error, reply);
    }
  }

  async approveLeave(request: FastifyRequest<{ Params: { id: string }, Body: ApproveLeaveDto }>, reply: FastifyReply) {
    try {
      const user = this.getUserContext(request);
      const result = await this.leaveManagementService.approveLeaveRequest(request.params.id, request.body.comment, user);
      return reply.status(200).send(result);
    } catch (error: any) {
      return this.handleError(error, reply);
    }
  }

  async rejectLeave(request: FastifyRequest<{ Params: { id: string }, Body: RejectLeaveDto }>, reply: FastifyReply) {
    try {
      const user = this.getUserContext(request);
      const result = await this.leaveManagementService.rejectLeaveRequest(request.params.id, request.body.comment, user);
      return reply.status(200).send(result);
    } catch (error: any) {
      return this.handleError(error, reply);
    }
  }

  async cancelLeave(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const user = this.getUserContext(request);
      const result = await this.leaveManagementService.cancelLeaveRequest(request.params.id, user);
      return reply.status(200).send(result);
    } catch (error: any) {
      return this.handleError(error, reply);
    }
  }

  async discardDraft(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const user = this.getUserContext(request);
      await this.leaveManagementService.discardDraftLeaveRequest(request.params.id, user);
      return reply.status(204).send();
    } catch (error: any) {
      return this.handleError(error, reply);
    }
  }

  async getLeaveBalance(request: FastifyRequest<{ Params: { employeeId: string } }>, reply: FastifyReply) {
    try {
      const user = this.getUserContext(request);
      const result = await this.leaveManagementService.getLeaveBalance(request.params.employeeId, user);
      return reply.status(200).send(result);
    } catch (error: any) {
      return this.handleError(error, reply);
    }
  }

  async getLeaveHistory(request: FastifyRequest<{ Querystring: LeaveHistoryQueryDto }>, reply: FastifyReply) {
    try {
      const user = this.getUserContext(request);
      const filters = {
        employeeId: request.query.employeeId,
        status: request.query.status,
        year: request.query.year ? Number(request.query.year) : undefined
      };
      const result = await this.leaveManagementService.getLeaveHistory(filters, user);
      return reply.status(200).send(result);
    } catch (error: any) {
      return this.handleError(error, reply);
    }
  }

  private handleError(error: any, reply: FastifyReply) {
    if (error.name === 'ValidationError' || error.name === 'BadRequestError' || error.name === 'InsufficientBalanceError') {
      return reply.status(400).send({ error: error.message });
    }
    if (error.name === 'NotFoundError') return reply.status(404).send({ error: error.message });
    if (error.name === 'ForbiddenError') return reply.status(403).send({ error: error.message });
    if (error.name === 'ConflictError') return reply.status(409).send({ error: error.message });
    console.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
}
