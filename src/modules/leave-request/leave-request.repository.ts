import { PoolClient } from 'pg';
import { IBaseRepository, BaseRepository } from 'shared/base-repository';
import { LeaveRequest } from './leave-request.model';
import { LeaveStatus } from 'shared/types';

export interface ILeaveRequestRepository extends IBaseRepository<LeaveRequest> {
  findByEmployeeId(employeeId: string, client?: PoolClient): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus, client?: PoolClient): Promise<LeaveRequest[]>;
  findOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeId?: string, client?: PoolClient): Promise<LeaveRequest[]>;
  findByDateRange(startDate: Date, endDate: Date, client?: PoolClient): Promise<LeaveRequest[]>;
  findPendingForManager(managerId: string, client?: PoolClient): Promise<LeaveRequest[]>;
}

export class LeaveRequestRepository extends BaseRepository<LeaveRequest> implements ILeaveRequestRepository {
  protected readonly tableName = 'leave_requests';

  async findByEmployeeId(employeeId: string, client?: PoolClient): Promise<LeaveRequest[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employeeId],
    );
    return result.rows;
  }

  async findByStatus(status: LeaveStatus, client?: PoolClient): Promise<LeaveRequest[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE status = $1 ORDER BY created_at DESC`,
      [status],
    );
    return result.rows;
  }

  async findOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeId?: string, client?: PoolClient): Promise<LeaveRequest[]> {
    const executor = client ?? this.pool;
    const params: unknown[] = [employeeId, endDate, startDate];
    let sql = `SELECT * FROM ${this.tableName} WHERE employee_id = $1 AND start_date <= $2 AND end_date >= $3 AND status NOT IN ('REJECTED', 'CANCELLED')`;

    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id != $${params.length}`;
    }

    sql += ' ORDER BY start_date ASC';
    const result = await executor.query(sql, params);
    return result.rows;
  }

  async findByDateRange(startDate: Date, endDate: Date, client?: PoolClient): Promise<LeaveRequest[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE start_date <= $1 AND end_date >= $2 ORDER BY start_date ASC`,
      [endDate, startDate],
    );
    return result.rows;
  }

  async findPendingForManager(managerId: string, client?: PoolClient): Promise<LeaveRequest[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT lr.* FROM ${this.tableName} lr
       INNER JOIN employees e ON lr.employee_id = e.id
       WHERE e.manager_id = $1 AND lr.status = 'SUBMITTED'
       ORDER BY lr.created_at ASC`,
      [managerId],
    );
    return result.rows;
  }
}
