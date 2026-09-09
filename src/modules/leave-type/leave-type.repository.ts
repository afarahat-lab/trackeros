import { Pool, PoolClient, QueryResult } from 'pg';
import { pool as defaultPool } from '../../shared/db/connection';
import { LeaveType, CreateLeaveTypeInput } from './leave-type.model';
import { ILeaveTypeRepository } from './leave-type.repository.interface';

interface LeaveTypeRow {
  code: string;
  name: string;
  requires_approval: boolean;
  max_consecutive_days: number;
  is_paid: boolean;
}

function mapRow(row: LeaveTypeRow): LeaveType {
  return {
    code: row.code as LeaveType['code'],
    name: row.name,
    requiresApproval: row.requires_approval,
    maxConsecutiveDays: row.max_consecutive_days,
    isPaid: row.is_paid,
  };
}

const COLUMNS = 'code, name, requires_approval, max_consecutive_days, is_paid';

export class PgLeaveTypeRepository implements ILeaveTypeRepository {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  private db(client?: PoolClient): Pool | PoolClient {
    return client ?? this.dbPool;
  }

  async create(input: CreateLeaveTypeInput, client?: PoolClient): Promise<LeaveType> {
    const query = `
      INSERT INTO leave_types (code, name, requires_approval, max_consecutive_days, is_paid)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${COLUMNS}
    `;
    const values = [
      input.code,
      input.name,
      input.requiresApproval,
      input.maxConsecutiveDays,
      input.isPaid,
    ];
    const result: QueryResult<LeaveTypeRow> = await this.db(client).query(query, values);
    return mapRow(result.rows[0]);
  }

  async findByCode(
    code: LeaveType['code'],
    client?: PoolClient
  ): Promise<LeaveType | null> {
    const query = `SELECT ${COLUMNS} FROM leave_types WHERE code = $1`;
    const result: QueryResult<LeaveTypeRow> = await this.db(client).query(query, [code]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async findAll(client?: PoolClient): Promise<LeaveType[]> {
    const query = `SELECT ${COLUMNS} FROM leave_types`;
    const result: QueryResult<LeaveTypeRow> = await this.db(client).query(query);
    return result.rows.map(mapRow);
  }
}
