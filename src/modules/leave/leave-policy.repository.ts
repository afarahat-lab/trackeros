import { pool } from '../../shared/db/connection';
import { LeavePolicy, CreateLeavePolicyDto } from './leave-policy.model';

export interface ILeavePolicyRepository {
  findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]>;
  findById(id: string): Promise<LeavePolicy | null>;
  findAll(): Promise<LeavePolicy[]>;
  create(dto: CreateLeavePolicyDto): Promise<LeavePolicy>;
  update(id: string, dto: Partial<CreateLeavePolicyDto>): Promise<LeavePolicy | null>;
  softDelete(id: string): Promise<boolean>;
}

export class LeavePolicyRepository implements ILeavePolicyRepository {
  async findByLeaveTypeId(leaveTypeId: string): Promise<LeavePolicy[]> {
    const result = await pool.query<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE leave_type_id = $1 AND deleted_at IS NULL ORDER BY policy_name',
      [leaveTypeId]
    );
    return result.rows;
  }

  async findById(id: string): Promise<LeavePolicy | null> {
    const result = await pool.query<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<LeavePolicy[]> {
    const result = await pool.query<LeavePolicy>(
      'SELECT * FROM leave_policies WHERE deleted_at IS NULL ORDER BY policy_name'
    );
    return result.rows;
  }

  async create(dto: CreateLeavePolicyDto): Promise<LeavePolicy> {
    const result = await pool.query<LeavePolicy>(
      `INSERT INTO leave_policies (policy_name, leave_type_id, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.policyName,
        dto.leaveTypeId,
        dto.entitlementDays,
        dto.accrualRate,
        dto.maxAccumulation,
        dto.minimumNoticeDays,
        dto.requiresManagerApproval ?? true,
        dto.isActive ?? true,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, dto: Partial<CreateLeavePolicyDto>): Promise<LeavePolicy | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const addField = (column: string, value: unknown) => {
      fields.push(`${column} = $${paramIndex++}`);
      values.push(value);
    };

    if (dto.policyName !== undefined) addField('policy_name', dto.policyName);
    if (dto.leaveTypeId !== undefined) addField('leave_type_id', dto.leaveTypeId);
    if (dto.entitlementDays !== undefined) addField('entitlement_days', dto.entitlementDays);
    if (dto.accrualRate !== undefined) addField('accrual_rate', dto.accrualRate);
    if (dto.maxAccumulation !== undefined) addField('max_accumulation', dto.maxAccumulation);
    if (dto.minimumNoticeDays !== undefined) addField('minimum_notice_days', dto.minimumNoticeDays);
    if (dto.requiresManagerApproval !== undefined) addField('requires_manager_approval', dto.requiresManagerApproval);
    if (dto.isActive !== undefined) addField('is_active', dto.isActive);

    if (fields.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query<LeavePolicy>(
      `UPDATE leave_policies SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE leave_policies SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
