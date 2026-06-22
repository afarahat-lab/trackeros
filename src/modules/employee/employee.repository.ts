import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { Employee, CreateEmployeeInput, UpdateEmployeeInput } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private db: Pool = pool) {}

  private mapRowToEmployee(row: any): Employee {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      managerId: row.manager_id,
      department: row.department,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private stripPii(employee: Employee) {
    const { name, email, ...rest } = employee;
    return rest;
  }

  async findById(id: string): Promise<Employee | null> {
    const result = await this.db.query('SELECT * FROM employees WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRowToEmployee(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await this.db.query('SELECT * FROM employees WHERE email = $1', [email]);
    return result.rows[0] ? this.mapRowToEmployee(result.rows[0]) : null;
  }

  async findAll(): Promise<Employee[]> {
    const result = await this.db.query('SELECT * FROM employees');
    return result.rows.map(this.mapRowToEmployee);
  }

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `INSERT INTO employees (name, email, manager_id, department, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [input.name, input.email, input.managerId, input.department, input.status]
      );
      const newEmployee = this.mapRowToEmployee(result.rows[0]);
      
      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        ['employee', newEmployee.id, 'create', null, JSON.stringify(this.stripPii(newEmployee))]
      );
      
      await client.query('COMMIT');
      return newEmployee;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      const existingResult = await client.query('SELECT * FROM employees WHERE id = $1', [id]);
      if (!existingResult.rows[0]) throw new Error('Employee not found');
      const existingEmployee = this.mapRowToEmployee(existingResult.rows[0]);

      const result = await client.query(
        `UPDATE employees 
         SET name = COALESCE($1, name), 
             email = COALESCE($2, email), 
             manager_id = COALESCE($3, manager_id), 
             department = COALESCE($4, department), 
             status = COALESCE($5, status),
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [input.name, input.email, input.managerId, input.department, input.status, id]
      );
      const updatedEmployee = this.mapRowToEmployee(result.rows[0]);

      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'employee', 
          id, 
          'update', 
          JSON.stringify(this.stripPii(existingEmployee)), 
          JSON.stringify(this.stripPii(updatedEmployee))
        ]
      );

      await client.query('COMMIT');
      return updatedEmployee;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      const existingResult = await client.query('SELECT * FROM employees WHERE id = $1', [id]);
      if (!existingResult.rows[0]) throw new Error('Employee not found');
      const existingEmployee = this.mapRowToEmployee(existingResult.rows[0]);

      await client.query('DELETE FROM employees WHERE id = $1', [id]);

      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        ['employee', id, 'delete', JSON.stringify(this.stripPii(existingEmployee)), null]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
