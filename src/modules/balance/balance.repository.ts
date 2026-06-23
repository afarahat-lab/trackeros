import { LeaveBalance } from './balance.model';
import { BaseRepository } from '../../shared/base-repository';
import { pool } from '../../shared/db/connection';
import { PoolClient } from 'pg';

export interface ILeaveBalanceRepository {
  findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null>;
  findByEmployee(employeeId: string): Promise<LeaveBalance[]>;
  deductDays(id: string, days: number): Promise<LeaveBalance>;
  restoreDays(id: string, days: number): Promise<LeaveBalance>;
}

export class PgLeaveBalanceRepository extends BaseRepository<LeaveBalance> implements ILeaveBalanceRepository {
  constructor() {
    super(pool);
  }

  async findById(id: string, client?: PoolClient): Promise<LeaveBalance | null> {
    const executor = client || this.pool;
    const result = await executor.query('SELECT * FROM leave_balances WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findAll(filters?: Record<string, any>, client?: PoolClient): Promise<LeaveBalance[]> {
    const executor = client || this.pool;
    const result = await executor.query('SELECT * FROM leave_balances');
    return result.rows;
  }

  async create(entity: Omit<LeaveBalance, 'id' | 'createdAt' | 'updatedAt'>, client?: PoolClient): Promise<LeaveBalance> {
    const executor = client || this.pool;
    const result = await executor.query(
      `INSERT INTO leave_balances (employee_id, policy_id, total_entitlement, used_days, remaining_days, fiscal_year, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        entity.employeeId, entity.policyId, entity.totalEntitlement, entity.usedDays,
        entity.remainingDays, entity.fiscalYear, entity.status
      ]
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<LeaveBalance>, client?: PoolClient): Promise<LeaveBalance> {
    const executor = client || this.pool;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`).join(', ');
    
    const result = await executor.query(
      `UPDATE leave_balances SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async delete(id: string, client?: PoolClient): Promise<void> {
    const executor = client || this.pool;
    await executor.query('DELETE FROM leave_balances WHERE id = $1', [id]);
  }

  async findByEmployeeAndPolicy(employeeId: string, policyId: string, fiscalYear: number): Promise<LeaveBalance | null> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND policy_id = $2 AND fiscal_year = $3 AND deleted_at IS NULL',
      [employeeId, policyId, fiscalYear]
    );
    return result.rows[0] || null;
  }

  async findByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    const result = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND deleted_at IS NULL',
      [employeeId]
    );
    return result.rows;
  }

  async deductDays(id: string, days: number): Promise<LeaveBalance> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const balanceResult = await client.query(
        'SELECT * FROM leave_balances WHERE id = $1 FOR UPDATE',
        [id]
      );
      const balance = balanceResult.rows[0];
      if (!balance) throw new Error('Balance not found');
      if (balance.remaining_days < days) throw new Error('Insufficient balance');
      const updated = await client.query(
        'UPDATE leave_balances SET remaining_days = remaining_days - $1, used_days = used_days + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [days, id]
      );
      await client.query(
        'INSERT INTO audit_records (entity_type, entity_id, action, old_values, new_values, performed_by) VALUES ($1, $2, $3, $4, $5, $6)',
        ['leave_balances', id, 'UPDATE', JSON.stringify(balance), JSON.stringify(updated.rows[0]), null]
      );
      await client.query('COMMIT');
      return updated.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async restoreDays(id: string, days: number): Promise<LeaveBalance> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const balanceResult = await client.query(
        'SELECT * FROM leave_balances WHERE id = $1 FOR UPDATE',
        [id]
      );
      const balance = balanceResult.rows[0];
      if (!balance) throw new Error('Balance not found');
      const updated = await client.query(
        'UPDATE leave_balances SET remaining_days = remaining_days + $1, used_days = used_days - $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [days, id]
      );
      await client.query(
        'INSERT INTO audit_records (entity_type, entity_id, action, old_values, new_values, performed_by) VALUES ($1, $2, $3, $4, $5, $6)',
        ['leave_balances', id, 'UPDATE', JSON.stringify(balance), JSON.stringify(updated.rows[0]), null]
      );
      await client.query('COMMIT');
      return updated.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
