import { ILeaveRequestService } from './leave-request.service.interface';
import { LeaveRequest } from './leave-request.model';
import { CreateLeaveRequestDto, LeaveRequestQueryParams } from '../../shared/types';

function serializeLeaveRequest(request: LeaveRequest): Record<string, unknown> {
  return {
    id: request.id,
    employeeId: request.employeeId,
    leavePolicyId: request.leavePolicyId,
    startDate: request.startDate.toISOString(),
    endDate: request.endDate.toISOString(),
    reason: request.reason,
    status: request.status,
    approvedBy: request.approvedBy,
    approvedAt: request.approvedAt?.toISOString() ?? null,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

export class LeaveRequestController {
  constructor(private readonly service: ILeaveRequestService) {}

  async createDraft(body: CreateLeaveRequestDto): Promise<Record<string, unknown>> {
    const result = await this.service.createDraft(body);
    return serializeLeaveRequest(result);
  }

  async submit(id: string): Promise<Record<string, unknown>> {
    const result = await this.service.submit(id);
    return serializeLeaveRequest(result);
  }

  async approve(id: string, approverId: string): Promise<Record<string, unknown>> {
    const result = await this.service.approve(id, approverId);
    return serializeLeaveRequest(result);
  }

  async reject(id: string, approverId: string): Promise<Record<string, unknown>> {
    const result = await this.service.reject(id, approverId);
    return serializeLeaveRequest(result);
  }

  async cancel(id: string): Promise<Record<string, unknown>> {
    const result = await this.service.cancel(id);
    return serializeLeaveRequest(result);
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    const result = await this.service.findById(id);
    if (!result) {
      return null;
    }
    return serializeLeaveRequest(result);
  }

  async findByEmployeeId(employeeId: string): Promise<Record<string, unknown>[]> {
    const results = await this.service.findByEmployeeId(employeeId);
    return results.map(serializeLeaveRequest);
  }

  async query(params: LeaveRequestQueryParams): Promise<Record<string, unknown>[]> {
    const results = await this.service.query(params);
    return results.map(serializeLeaveRequest);
  }
}
