import { Pool } from 'pg';
import pool from '../../shared/db/connection';
import { LeaveBalance, CreateLeaveBalanceDto, UpdateLeaveBalanceDto, ILeaveBalanceRepository } from './balance.model';

export class LeaveBalanceRepository implements ILeaveBalanceRepository {
  constructor(private readonly db: Pool = pool) {}

  async create(dto: CreateLeaveBalanceDto): Promise<LeaveBalance> {
    const query = `
      INSERT INTO leave_balances (employee_id, policy_id, balance_days, fiscal_year)
      VALUES ($1, $2, $3, $4)
      RETURNING id, employee_id AS "employeeId", policy_id AS "policyId",
                balance_days AS "balanceDays", fiscal_year AS "fiscalYear",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [dto.employeeId, dto.policyId, dto.balanceDays, dto.fiscalYear];
    
    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create leave balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findById(id: string): Promise<LeaveBalance | null> {
    const query = `
      SELECT id, employee_id AS "employeeId", policy_id AS "policyId",
             balance_days AS "balanceDays", fiscal_year AS "fiscalYear",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM leave_balances
      WHERE id = $1
    `;
    
    try {
      const result = await this.db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find leave balance by id: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null> {
    const query = `
      SELECT id, employee_id AS "employeeId", policy_id AS "policyId",
             balance_days AS "balanceDays", fiscal_year AS "fiscalYear",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM leave_balances
      WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3
    `;
    
    try {
      const result = await this.db.query(query, [employeeId, policyId, fiscalYear]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find leave balance by employee and policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findByEmployee(employeeId: string, fiscalYear: number): Promise<LeaveBalance[]> {
    const query = `
      SELECT id, employee_id AS "employeeId", policy_id AS "policyId",
             balance_days AS "balanceDays", fiscal_year AS "fiscalYear",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM leave_balances
      WHERE employee_id = $1 AND fiscal_year = $2
    `;
    
    try {
      const result = await this.db.query(query, [employeeId, fiscalYear]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to find leave balances by employee: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async update(id: string, dto: UpdateLeaveBalanceDto): Promise<LeaveBalance> {
    const query = `
      UPDATE leave_balances
      SET balance_days = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, employee_id AS "employeeId", policy_id AS "policyId",
                balance_days AS "balanceDays", fiscal_year AS "fiscalYear",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    
    try {
      const result = await this.db.query(query, [dto.balanceDays, id]);
      if (result.rows.length === 0) {
        throw new Error(`Leave balance with id ${id} not found`);
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update leave balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM leave_balances
      WHERE id = $1
      RETURNING id
    `;
    
    try {
      const result = await this.db.query(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`Failed to delete leave balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
