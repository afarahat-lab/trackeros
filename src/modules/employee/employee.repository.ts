import { Pool } from 'pg';
import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';
import { EmploymentStatus } from '../../shared/types/index';

export class PgEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Employee | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at FROM employees WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToEmployee(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find employee by id: ${message}`);
    }
  }

  async findByEmail(email: string): Promise<Employee | null> {
    try {
      const result = await this.pool.query(
        'SELECT id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at FROM employees WHERE email = $1',
        [email]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToEmployee(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find employee by email: ${message}`);
    }
  }

  async findAll(): Promise<Employee[]> {
    try {
      const result = await this.pool.query(
        'SELECT id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at FROM employees ORDER BY last_name, first_name'
      );
      return result.rows.map(row => this.mapRowToEmployee(row));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to find all employees: ${message}`);
    }
  }

  async create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    try {
      const result = await this.pool.query(
        `INSERT INTO employees (first_name, last_name, email, employment_status, manager_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at`,
        [employee.firstName, employee.lastName, employee.email, employee.employmentStatus, employee.managerId]
      );
      return this.mapRowToEmployee(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create employee: ${message}`);
    }
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.firstName !== undefined) {
        setClauses.push(`first_name = $${paramIndex++}`);
        values.push(data.firstName);
      }
      if (data.lastName !== undefined) {
        setClauses.push(`last_name = $${paramIndex++}`);
        values.push(data.lastName);
      }
      if (data.email !== undefined) {
        setClauses.push(`email = $${paramIndex++}`);
        values.push(data.email);
      }
      if (data.employmentStatus !== undefined) {
        setClauses.push(`employment_status = $${paramIndex++}`);
        values.push(data.employmentStatus);
      }
      if (data.managerId !== undefined) {
        setClauses.push(`manager_id = $${paramIndex++}`);
        values.push(data.managerId);
      }

      if (setClauses.length === 0) {
        return this.findById(id);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const result = await this.pool.query(
        `UPDATE employees SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
         RETURNING id, first_name, last_name, email, employment_status, manager_id, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) return null;
      return this.mapRowToEmployee(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update employee: ${message}`);
    }
  }

  private mapRowToEmployee(row: Record<string, unknown>): Employee {
    const status = row.employment_status as string;
    if (!Object.values(EmploymentStatus).includes(status as EmploymentStatus)) {
      throw new Error(`Invalid employment status from database: ${status}`);
    }
    return {
      id: row.id as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      email: row.email as string,
      employmentStatus: status as EmploymentStatus,
      managerId: row.manager_id as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
