
import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import type {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveBalance,
  CreateLeaveRequestDto,
  UpdateLeaveRequestStatusDto,
} from './leave.model';

export interface ILeaveRepository {
  findById(id: string): Promise<LeaveRequest | null>;
  findByEmployeeId(employeeId: string): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]>;
  create(dto: CreateLeaveRequestDto): Promise<LeaveRequest>;
  updateStatus(id: string, dto: UpdateLeaveRequestStatusDto): Promise<LeaveRequest | null>;
  getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null>;
  upsertBalance(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance>;
  decrementBalance(employeeId: string, leaveTypeId: string, year: number, days: number): Promise<LeaveBalance | null>;
}

export class LeaveRepository implements ILeaveRepository {
  private pool: Pool;

  constructor(pgPool: Pool = pool) {
    this.pool = pgPool;
  }

  async findById(id: string): Promise<LeaveRequest | null> {
    const result = await this.pool.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByEmployeeId(employeeId: string): Promise<LeaveRequest[]> {
    const result = await this.pool.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId],
    );
    return result.rows;
  }

  async findByStatus(status: LeaveRequestStatus): Promise<LeaveRequest[]> {
    const result = await this.pool.query<LeaveRequest>(
      'SELECT * FROM leave_requests WHERE status = $1',
      [status],
    );
    return result.rows;
  }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const result = await this.pool.query<LeaveRequest>(
      `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'DRAFT')
       RETURNING *`,
      [dto.employeeId, dto.leaveTypeId, dto.startDate, dto.endDate, dto.reason ?? null],
    );
    return result.rows[0];
  }

  async updateStatus(id: string, dto: UpdateLeaveRequestStatusDto): Promise<LeaveRequest | null> {
    const now = new Date();

    switch (dto.status) {
      case 'APPROVED': {
        const result = await this.pool.query<LeaveRequest>(
          `UPDATE leave_requests
           SET status = $1, approved_by = $2, approved_at = $3, updated_at = $3
           WHERE id = $4
           RETURNING *`,
          [dto.status, dto.reviewerId, now, id],
        );
        return result.rows[0] ?? null;
      }
      case 'REJECTED': {
        const result = await this.pool.query<LeaveRequest>(
          `UPDATE leave_requests
           SET status = $1, rejected_by = $2, rejected_at = $3, rejection_reason = $4, updated_at = $3
           WHERE id = $5
           RETURNING *`,
          [dto.status, dto.reviewerId, now, dto.rejectionReason ?? null, id],
        );
        return result.rows[0] ?? null;
      }
      case 'CANCELLED': {
        const result = await this.pool.query<LeaveRequest>(
          `UPDATE leave_requests
           SET status = $1, cancelled_by = $2, cancelled_at = $3, updated_at = $3
           WHERE id = $4
           RETURNING *`,
          [dto.status, dto.reviewerId, now, id],
        );
        return result.rows[0] ?? null;
      }
      default: {
        const result = await this.pool.query<LeaveRequest>(
          `UPDATE leave_requests
           SET status = $1, updated_at = $2
           WHERE id = $3
           RETURNING *`,
          [dto.status, now, id],
        );
        return result.rows[0] ?? null;
      }
    }
  }

  async getBalance(employeeId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | null> {
    const result = await this.pool.query<LeaveBalance>(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3',
      [employeeId, leaveTypeId, year],
    );
    return result.rows[0] ?? null;
  }

  async upsertBalance(balance: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeaveBalance> {
    const result = await this.pool.query<LeaveBalance>(
      `INSERT INTO leave_balances (employee_id, leave_type_id, entitlement_days, used_days, accrued_days, year)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id, leave_type_id, year)
       DO UPDATE SET entitlement_days = EXCLUDED.entitlement_days,
                     used_days = EXCLUDED.used_days,
                     accrued_days = EXCLUDED.accrued_days,
                     updated_at = NOW()
       RETURNING *`,
      [
        balance.employeeId,
        balance.leaveTypeId,
        balance.entitlementDays,
        balance.usedDays,
        balance.accruedDays,
        balance.year,
      ],
    );
    return result.rows[0];
  }

  async decrementBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    days: number,
  ): Promise<LeaveBalance | null> {
    const result = await this.pool.query<LeaveBalance>(
      `UPDATE leave_balances
       SET used_days = used_days + $1, updated_at = NOW()
       WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
       RETURNING *`,
      [days, employeeId, leaveTypeId, year],
    );
    return result.rows[0] ?? null;
  }
}
