import { Pool } from "pg";
import pool from "../../shared/db/connection";
import { CreateLeavePolicyDto, LeavePolicy, UpdateLeavePolicyDto } from "./policy.model";

export interface ILeavePolicyRepository {
  create(data: CreateLeavePolicyDto): Promise<LeavePolicy>;
  findById(id: string): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  findByLeaveType(leaveType: string): Promise<LeavePolicy[]>;
  update(id: string, data: UpdateLeavePolicyDto): Promise<LeavePolicy>;
  delete(id: string): Promise<void>;
  findActivePolicies(): Promise<LeavePolicy[]>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: CreateLeavePolicyDto): Promise<LeavePolicy> {
    const query = `
      INSERT INTO leave_policies (
        policy_name, leave_type, entitlement_days, accrual_rate,
        max_carryover, requires_approval, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.policyName,
      data.leaveType,
      data.entitlementDays,
      data.accrualRate ?? null,
      data.maxCarryover ?? null,
      data.requiresApproval ?? true,
      data.isActive ?? true
    ];
    const result = await this.pool.query<LeavePolicy>(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    const query = `SELECT * FROM leave_policies WHERE id = $1`;
    const result = await this.pool.query<LeavePolicy>(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(): Promise<LeavePolicy[]> {
    const query = `SELECT * FROM leave_policies ORDER BY policy_name`;
    const result = await this.pool.query<LeavePolicy>(query);
    return result.rows;
  }

  async findByLeaveType(leaveType: string): Promise<LeavePolicy[]> {
    const query = `SELECT * FROM leave_policies WHERE leave_type = $1 ORDER BY policy_name`;
    const result = await this.pool.query<LeavePolicy>(query, [leaveType]);
    return result.rows;
  }

  async update(id: string, data: UpdateLeavePolicyDto): Promise<LeavePolicy> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.policyName !== undefined) {
      updates.push(`policy_name = $${paramCount}`);
      values.push(data.policyName);
      paramCount++;
    }
    if (data.leaveType !== undefined) {
      updates.push(`leave_type = $${paramCount}`);
      values.push(data.leaveType);
      paramCount++;
    }
    if (data.entitlementDays !== undefined) {
      updates.push(`entitlement_days = $${paramCount}`);
      values.push(data.entitlementDays);
      paramCount++;
    }
    if (data.accrualRate !== undefined) {
      updates.push(`accrual_rate = $${paramCount}`);
      values.push(data.accrualRate);
      paramCount++;
    }
    if (data.maxCarryover !== undefined) {
      updates.push(`max_carryover = $${paramCount}`);
      values.push(data.maxCarryover);
      paramCount++;
    }
    if (data.requiresApproval !== undefined) {
      updates.push(`requires_approval = $${paramCount}`);
      values.push(data.requiresApproval);
      paramCount++;
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(data.isActive);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const query = `
      UPDATE leave_policies
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await this.pool.query<LeavePolicy>(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Leave policy with id ${id} not found`);
    }
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    const query = `DELETE FROM leave_policies WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error(`Leave policy with id ${id} not found`);
    }
  }

  async findActivePolicies(): Promise<LeavePolicy[]> {
    const query = `SELECT * FROM leave_policies WHERE is_active = true ORDER BY policy_name`;
    const result = await this.pool.query<LeavePolicy>(query);
    return result.rows;
  }
}
