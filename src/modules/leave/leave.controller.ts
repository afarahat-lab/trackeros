import { LeaveService } from './leave.service';
import { BalanceService } from '../balance/balance.service';
import { CreateLeaveRequestDto } from './leave.model';
import { AuthenticatedRequest } from '../../shared/types/auth';

interface FastifyReply {
  code(status: number): FastifyReply;
  send(payload?: any): FastifyReply;
}

export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly balanceService: BalanceService
  ) {}

  async applyLeave(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    const dto: CreateLeaveRequestDto = request.body as CreateLeaveRequestDto;
    const employeeId = request.user.id;
    const leaveRequest = await (this.leaveService as any).applyLeave(employeeId, dto);
    reply.code(201).send(leaveRequest);
  }

  async approveLeave(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const approverId = request.user.id;
    const leaveRequest = await (this.leaveService as any).approveLeave(id, approverId);
    reply.send(leaveRequest);
  }

  async rejectLeave(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const approverId = request.user.id;
    const reason = (request.body as any)?.reason;
    const leaveRequest = await (this.leaveService as any).rejectLeave(id, approverId, reason);
    reply.send(leaveRequest);
  }

  async cancelLeave(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const employeeId = request.user.id;
    const leaveRequest = await (this.leaveService as any).cancelLeave(id, employeeId);
    reply.send(leaveRequest);
  }

  async getLeaveRequest(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const leaveRequest = await (this.leaveService as any).getLeaveRequest(id);
    reply.send(leaveRequest);
  }

  async getLeaveRequests(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    const filters = request.query as any;
    const leaveRequests = await (this.leaveService as any).getLeaveRequests(filters);
    reply.send(leaveRequests);
  }

  async getLeaveBalance(request: AuthenticatedRequest, reply: FastifyReply): Promise<void> {
    const employeeId = request.user.id;
    const { leaveTypeId, year } = request.query as any;
    const balance = await (this.balanceService as any).getBalance(employeeId, leaveTypeId, year);
    reply.send(balance);
  }
}
