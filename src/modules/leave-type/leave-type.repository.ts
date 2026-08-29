import type { PoolClient } from 'pg';

import { pool } from '../../shared/db/connection';
import { LeaveTypeCode } from '../../shared/types/enums';
import { ILeaveTypeRepository, LeaveType } from './leave-type.model';

const COLUMNS = [
  'id',
  'code',
  'name',
  'is_paid',
  'requires_manager_approval',
  'is_active'
] as const;

interface LeaveTypeRow {
  id: string;
  code: string;
  name: string;
  is_paid: boolean;
  requires_manager_approval: boolean;
  is_active: boolean;
}

type LeaveTypeCodeValue = (typeof LeaveTypeCode)[keyof typeof LeaveTypeCode];

function isLeaveTypeCode(value: string): value is LeaveTypeCodeValue {
  return Object.values(LeaveTypeCode).includes(value as LeaveTypeCodeValue);
}

function mapRow(row: LeaveTypeRow): LeaveType {
  return {
    id: row.id,
    code: isLeaveTypeCode(row.code) ? row.code : LeaveTypeCode.UNPAID,
    name: row.name,
    isPaid: row.is_paid,
    requiresManagerApproval: row.requires_manager_approval,
    isActive: row.is_active
  };
}

export class PgLeaveTypeRepository implements ILeaveTypeRepository {
  async create(leaveType: LeaveType, client?: PoolClient): Promise<LeaveType> {
    const db = client ?? pool;
    const result = await db.query(
      `INSERT INTO leave_types (id, code, name, is_paid, requires_manager_approval, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, code, name, is_paid, requires_manager_approval, is_active`,
      [
        leaveType.id,
        leaveType.code,
        leaveType.name,
        leaveType.isPaid,
        leaveType.requiresManagerApproval,
        leaveType.isActive
      ]
    );
    return mapRow(result.rows[0] as LeaveTypeRow);
  }

  async update(leaveType: LeaveType, client?: PoolClient): Promise<LeaveType> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE leave_types
       SET code = $2, name = $3, is_paid = $4, requires_manager_approval = $5,
           is_active = $6
       WHERE id = $1
       RETURNING id, code, name, is_paid, requires_manager_approval, is_active`,
      [
        leaveType.id,
        leaveType.code,
        leaveType.name,
        leaveType.isPaid,
        leaveType.requiresManagerApproval,
        leaveType.isActive
      ]
    );
    return mapRow(result.rows[0] as LeaveTypeRow);
  }

  async findById(id: string, client?: PoolClient): Promise<LeaveType | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, code, name, is_paid, requires_manager_approval, is_active
       FROM leave_types WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] as LeaveTypeRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByCode(
    code: LeaveTypeCode,
    client?: PoolClient
  ): Promise<LeaveType | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, code, name, is_paid, requires_manager_approval, is_active
       FROM leave_types WHERE code = $1`,
      [code]
    );
    const row = result.rows[0] as LeaveTypeRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findActive(client?: PoolClient): Promise<LeaveType[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, code, name, is_paid, requires_manager_approval, is_active
       FROM leave_types WHERE is_active = true ORDER BY name`
    );
    return (result.rows as LeaveTypeRow[]).map(mapRow);
  }
}
