import { PoolClient } from 'pg';
import { BaseRepository } from '../../shared/base-repository';
import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

export class EmployeeRepository extends BaseRepository<Employee> {
  constructor() {
    super(pool);
  }

  async findById(id: string, client?: PoolClient): Promise<Employee | null> {
    const executor = client || this.pool;
    const result = await executor.query(
      'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL', 
      [id]
    );
    return result.rows[0] || null;
  }

  async findAll(filters?: Record<string, any>, client?: PoolClient): Promise<Employee[]> {
    const executor = client || this.pool;
    const result = await executor.query('SELECT * FROM employees WHERE deleted_at IS NULL');
    return result.rows;
  }

  async create(entity: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>, client?: PoolClient): Promise<Employee> {
    const executor = client || this.pool;
    const result = await executor.query(
      `INSERT INTO employees (employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        entity.employeeNumber, entity.firstName, entity.lastName, entity.email, 
        entity.managerId, entity.department, entity.hireDate, entity.terminationDate, 
        entity.employmentStatus, entity.deletedAt
      ]
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<Employee>, client?: PoolClient): Promise<Employee> {
    const executor = client || this.pool;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((key, index) => `${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`).join(', ');
    
    const result = await executor.query(
      `UPDATE employees SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async delete(id: string, client?: PoolClient): Promise<void> {
    const executor = client || this.pool;
    await executor.query('UPDATE employees SET deleted_at = NOW() WHERE id = $1', [id]);
  }
}
