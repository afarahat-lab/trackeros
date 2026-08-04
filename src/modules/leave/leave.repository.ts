import { pool } from '../../shared/db/connection';
import { LeaveRequest, CreateLeaveRequestDto, UpdateLeaveRequestDto, LeaveRequestQueryParams } from './leave.model';
import { LeaveStatus } from '../../shared/types/index';

export interface ILeaveRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployee(employeeId: string, queryParams?: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  findByApprover(approverId: string, queryParams?: LeaveRequestQueryParams): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  updateStatus(id: string, status: LeaveStatus, approvedBy?: string, approvedAt?: Date): Promise<LeaveRequest | null>;
  update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null>;
}

interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapRowToLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeId: row.leave_type_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason ?? undefined,
    status: row.status as LeaveStatus,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function buildQueryFilters(
  queryParams: LeaveRequestQueryParams | undefined,
  conditions: string[],
  params: unknown[],
  paramIndex: number,
): number {
  let idx = paramIndex;

  if (queryParams?.status) {
    conditions.push(`lr.status = $${idx}`);
    params.push(queryParams.status);
    idx++;
  }
  if (queryParams?.leaveTypeId) {
    conditions.push(`lr.leave_type_id = $${idx}`);
    params.push(queryParams.leaveTypeId);
    idx++;
  }
  if (queryParams?.startDateFrom) {
    conditions.push(`lr.start_date >= $${idx}`);
    params.push(queryParams.startDateFrom);
    idx++;
  }
  if (queryParams?.startDateTo) {
    conditions.push(`lr.start_date <= $${idx}`);
    params.push(queryParams.startDateTo);
    idx++;
  }
  if (queryParams?.endDateFrom) {
    conditions.push(`lr.end_date >= $${idx}`);
    params.push(queryParams.endDateFrom);
    idx++;
  }
  if (queryParams?.endDateTo) {
    conditions.push(`lr.end_date <= $${idx}`);
    params.push(queryParams.endDateTo);
    idx++;
  }

  return idx;
}

export class LeaveRepository implements ILeaveRepository {
  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeaveRequest(result.rows[0] as LeaveRequestRow);
  }

  async findByEmployee(
    employeeId: string,
    queryParams?: LeaveRequestQueryParams,
  ): Promise<LeaveRequest[]> {
    const conditions: string[] = ['lr.employee_id = $1'];
    const params: unknown[] = [employeeId];
    let paramIndex = 2;

    paramIndex = buildQueryFilters(queryParams, conditions, params, paramIndex);

    const whereClause = conditions.join(' AND ');
    let sql = `SELECT lr.* FROM leave_requests lr WHERE ${whereClause} ORDER BY lr.created_at DESC`;

    if (queryParams?.limit !== undefined) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(queryParams.limit);
      paramIndex++;
    }
    if (queryParams?.offset !== undefined) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(queryParams.offset);
      paramIndex++;
    }

    const result = await pool.query(sql, params);
    return result.rows.map((row: LeaveRequestRow) => mapRowToLeaveRequest(row));
  }

  async findByApprover(
    approverId: string,
    queryParams?: LeaveRequestQueryParams,
  ): Promise<LeaveRequest[]> {
    const conditions: string[] = ['e.manager_id = $1'];
    const params: unknown[] = [approverId];
    let paramIndex = 2;

    paramIndex = buildQueryFilters(queryParams, conditions, params, paramIndex);

    const whereClause = conditions.join(' AND ');
    let sql = `SELECT lr.* FROM leave_requests lr INNER JOIN employees e ON lr.employee_id = e.id WHERE ${whereClause} ORDER BY lr.created_at DESC`;

    if (queryParams?.limit !== undefined) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(queryParams.limit);
      paramIndex++;
    }
    if (queryParams?.offset !== undefined) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(queryParams.offset);
      paramIndex++;
    }

    const result = await pool.query(sql, params);
    return result.rows.map((row: LeaveRequestRow) => mapRowToLeaveRequest(row));
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const result = await pool.query(
      `INSERT INTO leave_requests (
        employee_id, leave_type_id, start_date, end_date, reason, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW()
      ) RETURNING *`,
      [
        dto.employeeId,
        dto.leaveTypeId,
        dto.startDate,
        dto.endDate,
        dto.reason ?? null,
        LeaveStatus.DRAFT,
      ],
    );
    return mapRowToLeaveRequest(result.rows[0] as LeaveRequestRow);
  }

  async updateStatus(
    id: string,
    status: LeaveStatus,
    approvedBy?: string,
    approvedAt?: Date,
  ): Promise<LeaveRequest | null> {
    const setters: string[] = ['status = $1', 'updated_at = NOW()'];
    const params: unknown[] = [status];
    let paramIndex = 2;

    if (approvedBy !== undefined) {
      setters.push(`approved_by = $${paramIndex}`);
      params.push(approvedBy);
      paramIndex++;
    }
    if (approvedAt !== undefined) {
      setters.push(`approved_at = $${paramIndex}`);
      params.push(approvedAt);
      paramIndex++;
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE leave_requests SET ${setters.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeaveRequest(result.rows[0] as LeaveRequestRow);
  }

  async update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveRequest | null> {
    const setters: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const mutableFields: (keyof UpdateLeaveRequestDto)[] = [
      'startDate',
      'endDate',
      'reason',
    ];

    for (const field of mutableFields) {
      if (dto[field] !== undefined) {
        const columnName = camelToSnake(field);
        setters.push(`${columnName} = $${paramIndex}`);
        params.push(dto[field]);
        paramIndex++;
      }
    }

    if (setters.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    setters.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE leave_requests SET ${setters.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToLeaveRequest(result.rows[0] as LeaveRequestRow);
  }
}
