import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateLeaveRequestApiDto } from './leave.dto';
import { CreateLeaveRequestDto } from '../leave/leave.model';
import { ILeaveManagementService, UserContext } from '../leave-management/leave-management.service.interface';

export class LeaveController {
  constructor(private leaveService: ILeaveManagementService) {}

  async submitLeaveRequest(
    request: FastifyRequest<{ Body: CreateLeaveRequestApiDto }>,
    reply: FastifyReply
  ) {
    const user = request.user as UserContext;
    const body = request.body;

    // Map API DTO to Domain DTO to satisfy the service method signature
    const domainDto: CreateLeaveRequestDto = {
      employeeId: body.employeeId,
      leaveTypeId: body.leaveTypeId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      reason: body.reason,
    };

    const result = await this.leaveService.submitLeaveRequest(domainDto, user);
    return reply.status(201).send(result);
  }

  async getLeaveRequestById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const user = request.user as UserContext;
    const id = request.params?.id;
    if (!id) {
      return reply.status(400).send({ error: 'Missing id parameter' });
    }
    
    const result = await this.leaveService.getLeaveRequestById(id, user);
    return reply.status(200).send(result);
  }
}
