import { FastifyRequest, FastifyReply } from 'fastify';
import { validate } from 'class-validator';
import { ILeaveManagementService } from '../leave-management/leave-management.service.interface';
import {
  CreateLeaveRequestDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
} from './leave.dto';

interface UserContext {
  employeeId: string;
  role: string;
  userId: string;
}

export type AuthenticatedRequest = FastifyRequest & { user: UserContext };

export class LeaveController {
  constructor(private readonly leaveService: ILeaveManagementService) {}

  private async validateDto(dto: any, reply: FastifyReply): Promise<boolean> {
    const errors = await validate(dto);
    if (errors.length > 0) {
      reply.status(400).send({ message: 'Validation failed', errors });
      return false;
    }
    return true;
  }

  submit = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const dto = Object.assign(new CreateLeaveRequestDto(), request.body);
      if (!(await this.validateDto(dto, reply))) return;

      const result = await this.leaveService.submitLeaveRequest(dto, { id: request.user.employeeId, role: request.user.role });
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(500).send({ message: 'Internal server error' });
    }
  };

  approve = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const dto = Object.assign(new ApproveLeaveRequestDto(), request.body);
      if (!(await this.validateDto(dto, reply))) return;

      const result = await this.leaveService.approveLeaveRequest(request.params.id, dto.comment, { id: request.user.employeeId, role: request.user.role });
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(500).send({ message: 'Internal server error' });
    }
  };

  reject = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const dto = Object.assign(new RejectLeaveRequestDto(), request.body);
      if (!(await this.validateDto(dto, reply))) return;

      const result = await this.leaveService.rejectLeaveRequest(request.params.id, dto.comment, { id: request.user.employeeId, role: request.user.role });
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(500).send({ message: 'Internal server error' });
    }
  };

  cancel = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const result = await this.leaveService.cancelLeaveRequest(request.params.id, { id: request.user.employeeId, role: request.user.role });
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(500).send({ message: 'Internal server error' });
    }
  };

  discard = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      await this.leaveService.discardDraftLeaveRequest(request.params.id, { id: request.user.employeeId, role: request.user.role });
      return reply.status(204).send();
    } catch (error) {
      return reply.status(500).send({ message: 'Internal server error' });
    }
  };

  history = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const result = await this.leaveService.getLeaveHistory({ employeeId: request.user.employeeId }, { id: request.user.employeeId, role: request.user.role });
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(500).send({ message: 'Internal server error' });
    }
  };

  balances = async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const result = await this.leaveService.getLeaveBalance(request.user.employeeId, { id: request.user.employeeId, role: request.user.role });
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(500).send({ message: 'Internal server error' });
    }
  };
}
