import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeavePolicy, CreateLeavePolicyDto, UpdateLeavePolicyDto, AuditAction } from '../../shared/types';
import { IAuditService } from '../../shared/audit/audit.service';

export interface ILeavePolicyRepository {
  findById(id: string, client?: PoolClient): Promise<LeavePolicy | null>;
  findAll(filters?: Record<string, any>, client?: PoolClient): Promise<LeavePolicy[]>;
  create(entity: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'>, client?: PoolClient): Promise<LeavePolicy>;
  update(id: string, updates: Partial<LeavePolicy>, client?: PoolClient): Promise<LeavePolicy>;
  delete(id: string, client?: PoolClient): Promise<void>;
}

export interface IPolicyService {
  getPolicy(id: string): Promise<LeavePolicy | null>;
  getPolicies(): Promise<LeavePolicy[]>;
  createPolicy(dto: CreateLeavePolicyDto, performedBy?: string): Promise<LeavePolicy>;
  updatePolicy(id: string, dto: UpdateLeavePolicyDto, performedBy?: string): Promise<LeavePolicy>;
  deletePolicy(id: string, performedBy?: string): Promise<void>;
  validateEntitlement(policyId: string, requestedDays: number, remainingBalance: number): Promise<boolean>;
}

export class PolicyService implements IPolicyService {
  constructor(
    private readonly policyRepository: ILeavePolicyRepository,
    private readonly auditService: IAuditService,
    private readonly dbPool: Pool = pool
  ) {}

  async getPolicy(id: string): Promise<LeavePolicy | null> {
    return this.policyRepository.findById(id);
  }

  async getPolicies(): Promise<LeavePolicy[]> {
    const policies = await this.policyRepository.findAll();
    return policies.filter(p => p.isActive);
  }

  async createPolicy(dto: CreateLeavePolicyDto, performedBy?: string): Promise<LeavePolicy> {
    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      const newPolicy = await this.policyRepository.create(dto as any, client);
      
      await this.auditService.logAction({
        entityType: 'LeavePolicy',
        entityId: newPolicy.id,
        action: AuditAction.CREATE,
        newValues: dto as any,
        performedBy
      }, client);
      
      await client.query('COMMIT');
      return newPolicy;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePolicy(id: string, dto: UpdateLeavePolicyDto, performedBy?: string): Promise<LeavePolicy> {
    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      const oldPolicy = await this.policyRepository.findById(id, client);
      const updatedPolicy = await this.policyRepository.update(id, dto, client);
      
      await this.auditService.logAction({
        entityType: 'LeavePolicy',
        entityId: id,
        action: AuditAction.UPDATE,
        oldValues: oldPolicy as any,
        newValues: dto as any,
        performedBy
      }, client);
      
      await client.query('COMMIT');
      return updatedPolicy;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePolicy(id: string, performedBy?: string): Promise<void> {
    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');
      const oldPolicy = await this.policyRepository.findById(id, client);
      await this.policyRepository.delete(id, client);
      
      await this.auditService.logAction({
        entityType: 'LeavePolicy',
        entityId: id,
        action: AuditAction.DELETE,
        oldValues: oldPolicy as any,
        performedBy
      }, client);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async validateEntitlement(policyId: string, requestedDays: number, remainingBalance: number): Promise<boolean> {
    const policy = await this.policyRepository.findById(policyId);
    if (!policy) return false;
    if (!policy.isActive) return false;
    if (requestedDays > remainingBalance) return false;
    return true;
  }
}
