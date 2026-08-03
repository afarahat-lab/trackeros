import { Pool, QueryResult } from 'pg';
import { pool } from '../../shared/db/connection';
import { LeaveType } from './leave-type.model';
import { LeaveTypeCode } from '../../shared/types/leave-type-code.enum';

export interface ILeaveTypeRepository {
  findById(id: string): Promise<LeaveType | null>;
  findByCode(code: LeaveTypeCode): Promise<LeaveType | null>;
  findAllActive(): Promise<LeaveType[]>;
}

function rowToLeaveType(row: Record<string, unknown>): LeaveType {
  return {
    id: row.id as string,
    code: row.code as LeaveTypeCode,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class LeaveTypeRepository implements ILeaveTypeRepository {
  private readonly db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findById(id: string): Promise<LeaveType | null> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_types WHERE id = $1',
        [id],
      );
      if (result.rows.length === 0) {
        return null;
      }
      return rowToLeaveType(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find leave type by id: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findByCode(code: LeaveTypeCode): Promise<LeaveType | null> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_types WHERE code = $1',
        [code],
      );
      if (result.rows.length === 0) {
        return null;
      }
      return rowToLeaveType(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find leave type by code: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findAllActive(): Promise<LeaveType[]> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM leave_types WHERE is_active = true',
      );
      return (result.rows as Record<string, unknown>[]).map(rowToLeaveType);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find all active leave types: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
