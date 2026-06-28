import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeavePolicy, CreateLeavePolicyDto, UpdateLeavePolicyDto } from './policy.model';
import { LeaveType } from '../../shared/types/leave.types';

export interface ILeavePolicyRepository {
  findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>;
  update(id: string, dto: UpdateLeavePolicyDto): Promise<LeavePolicy>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  constructor(private readonly db: Pool = pool) {}

  async findByLeaveType(leaveType: LeaveType): Promise<LeavePolicy | null> {
    const result = await this.db.query<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE leave_type = $1',
      [leaveType]
    );
    return result.rows[0] || null;
  }

  async findAll(): Promise<LeavePolicy[]> {
    const result = await this.db.query<LeavePolicy>('SELECT * FROM leave_policies');
    return result.rows;
  }

  async create(dto: CreateLeavePolicyDto): Promise<LeavePolicy> {
    const { leaveType, entitlementDays, carryOverLimit, requiresApproval } = dto;
    const result = await this.db.query<LeavePolicy>(
      `INSERT INTO leave_policies (leave_type, entitlement_days, carry_over_limit, requires_approval)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [leaveType, entitlementDays, carryOverLimit, requiresApproval]
    );
    return result.rows[0];
  }

  async update(id: string, dto: UpdateLeavePolicyDto): Promise<LeavePolicy> {
    const { leaveType, entitlementDays, carryOverLimit, requiresApproval } = dto;
    const result = await this.db.query<LeavePolicy>(
      `UPDATE leave_policies
       SET leave_type = COALESCE($1, leave_type),
           entitlement_days = COALESCE($2, entitlement_days),
           carry_over_limit = COALESCE($3, carry_over_limit),
           requires_approval = COALESCE($4, requires_approval),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [leaveType, entitlementDays, carryOverLimit, requiresApproval, id]
    );
    return result.rows[0];
  }
}
