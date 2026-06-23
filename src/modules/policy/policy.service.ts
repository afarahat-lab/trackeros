import { LeavePolicy, CreateLeavePolicyDto, UpdateLeavePolicyDto, AuditAction } from '../../shared/types/index';
import { LeavePolicyRepository } from './policy.repository';
import { IAuditService } from '../../shared/audit/audit.service';

export interface ILeavePolicyRepository {
  findById(id: string): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  findByLeaveType(leaveTypeId: string): Promise<LeavePolicy | null>;
  create(entity: any): Promise<LeavePolicy>;
  update(id: string, updates: any): Promise<LeavePolicy>;
  delete(id: string): Promise<void>;
}

export interface IPolicyService {
  getPolicy(id: string): Promise<LeavePolicy | null>;
  getPolicies(): Promise<LeavePolicy[]>;
  getPolicyByLeaveType(leaveTypeId: string): Promise<LeavePolicy | null>;
  createPolicy(dto: CreateLeavePolicyDto, performedBy?: string): Promise<LeavePolicy>;
  updatePolicy(id: string, dto: UpdateLeavePolicyDto, performedBy?: string): Promise<LeavePolicy>;
  deletePolicy(id: string, performedBy?: string): Promise<void>;
  validateEntitlement(
    leaveTypeId: string,
    requestedDays: number,
    remainingBalance: number
  ): Promise<boolean>;
}

export class PolicyService implements IPolicyService {
  constructor(
    private readonly policyRepository: ILeavePolicyRepository,
    private readonly auditService: IAuditService,
    private readonly pool?: any
  ) {}

  async getPolicy(id: string): Promise<LeavePolicy | null> {
    return this.policyRepository.findById(id);
  }

  async getPolicies(): Promise<LeavePolicy[]> {
    const policies = await this.policyRepository.findAll();
    return policies.filter(p => p.isActive);
  }

  async getPolicyByLeaveType(leaveTypeId: string): Promise<LeavePolicy | null> {
    const policies = await this.policyRepository.findAll();
    return policies.find(p => p.leaveType === leaveTypeId || p.id === leaveTypeId) || null;
  }

  async createPolicy(dto: CreateLeavePolicyDto, performedBy: string = 'system'): Promise<LeavePolicy> {
    const entity = {
      policyName: dto.policyName,
      leaveType: dto.leaveType,
      entitlementDays: dto.entitlementDays,
      accrualRate: dto.accrualRate ?? null,
      maxAccumulation: dto.maxAccumulation ?? null,
      minimumNoticeDays: dto.minimumNoticeDays ?? null,
      requiresManagerApproval: dto.requiresManagerApproval ?? true,
      isActive: dto.isActive ?? true,
    };
    const policy = await this.policyRepository.create(entity as any);
    
    await this.auditService.logAction({
      entityType: 'LeavePolicy',
      entityId: policy.id,
      action: AuditAction.CREATE,
      newValues: policy as any,
      performedBy,
    });
    return policy;
  }

  async updatePolicy(id: string, dto: UpdateLeavePolicyDto, performedBy: string = 'system'): Promise<LeavePolicy> {
    const policy = await this.policyRepository.update(id, dto as any);
    
    await this.auditService.logAction({
      entityType: 'LeavePolicy',
      entityId: id,
      action: AuditAction.UPDATE,
      newValues: policy as any,
      performedBy,
    });
    return policy;
  }

  async deletePolicy(id: string, performedBy: string = 'system'): Promise<void> {
    await this.policyRepository.delete(id);
    
    await this.auditService.logAction({
      entityType: 'LeavePolicy',
      entityId: id,
      action: AuditAction.DELETE,
      performedBy,
    });
  }

  async validateEntitlement(
    leaveTypeId: string,
    requestedDays: number,
    remainingBalance: number
  ): Promise<boolean> {
    const policy = await this.getPolicyByLeaveType(leaveTypeId);
    if (!policy || !policy.isActive) {
      return false;
    }
    if (requestedDays > remainingBalance) {
      return false;
    }
    return true;
  }
}
