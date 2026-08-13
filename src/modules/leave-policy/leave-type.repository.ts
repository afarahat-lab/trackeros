import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveType } from './leave-type.model';
import {
  ILeaveTypeRepository,
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
} from './leave-type.repository.interface';
import { LeaveTypeCode } from '../../shared/types/leave-type-code.enum';

interface LeaveTypeRow {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

type Queryable = Pick<Pool, 'query'>;

function rowToLeaveType(row: LeaveTypeRow): LeaveType {
  return {
    id: row.id,
    code: row.code as LeaveTypeCode,
    label: row.label,
    description: row.description ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LeaveTypeRepository implements ILeaveTypeRepository {
  private readonly db: Queryable;

  constructor(client?: Queryable) {
    this.db = client ?? pool;
  }

  async findAll(): Promise<LeaveType[]> {
    const result = await this.db.query<LeaveTypeRow>(
      'SELECT id, code, label, description, is_active, created_at, updated_at FROM leave_types ORDER BY label ASC',
    );
    return result.rows.map(rowToLeaveType);
  }

  async findById(id: string): Promise<LeaveType | null> {
    const result = await this.db.query<LeaveTypeRow>(
      'SELECT id, code, label, description, is_active, created_at, updated_at FROM leave_types WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveType(result.rows[0]);
  }

  async findByCode(code: LeaveTypeCode): Promise<LeaveType | null> {
    const result = await this.db.query<LeaveTypeRow>(
      'SELECT id, code, label, description, is_active, created_at, updated_at FROM leave_types WHERE code = $1',
      [code],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveType(result.rows[0]);
  }

  async create(dto: CreateLeaveTypeDto): Promise<LeaveType> {
    const result = await this.db.query<LeaveTypeRow>(
      `INSERT INTO leave_types (code, label, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, code, label, description, is_active, created_at, updated_at`,
      [dto.code, dto.label, dto.description ?? null, dto.isActive ?? true],
    );
    return rowToLeaveType(result.rows[0]);
  }

  async update(id: string, dto: UpdateLeaveTypeDto): Promise<LeaveType | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.code !== undefined) {
      setClauses.push(`code = $${paramIndex++}`);
      values.push(dto.code);
    }
    if (dto.label !== undefined) {
      setClauses.push(`label = $${paramIndex++}`);
      values.push(dto.label);
    }
    if (dto.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }
    if (dto.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(dto.isActive);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query<LeaveTypeRow>(
      `UPDATE leave_types SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, code, label, description, is_active, created_at, updated_at`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToLeaveType(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM leave_types WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
