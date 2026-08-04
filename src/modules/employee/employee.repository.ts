import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findByDepartment(department: string): Promise<Employee[]>;
  findActive(): Promise<Employee[]>;
  save(employee: Employee): Promise<Employee>;
  update(id: string, partial: Partial<Employee>): Promise<Employee | null>;
  softDelete(id: string): Promise<void>;
}

export class PgEmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
      [employeeNumber]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
      [managerId]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findByDepartment(department: string): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE department = $1 AND deleted_at IS NULL',
      [department]
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findActive(): Promise<Employee[]> {
    const result = await pool.query(
      "SELECT * FROM employees WHERE employment_status = 'ACTIVE' AND deleted_at IS NULL"
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async save(employee: Employee): Promise<Employee> {
    const result = await pool.query(
      `INSERT INTO employees (id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        employee.id,
        employee.employeeNumber,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.managerId,
        employee.department,
        employee.hireDate,
        employee.terminationDate,
        employee.employmentStatus,
        employee.createdAt,
        employee.updatedAt,
        employee.deletedAt,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, partial: Partial<Employee>): Promise<Employee | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const merged = { ...existing, ...partial, id, updatedAt: new Date() };
    const result = await pool.query(
      `UPDATE employees SET
        employee_number = $1, first_name = $2, last_name = $3, email = $4,
        manager_id = $5, department = $6, hire_date = $7, termination_date = $8,
        employment_status = $9, created_at = $10, updated_at = $11, deleted_at = $12
       WHERE id = $13 AND deleted_at IS NULL
       RETURNING *`,
      [
        merged.employeeNumber,
        merged.firstName,
        merged.lastName,
        merged.email,
        merged.managerId,
        merged.department,
        merged.hireDate,
        merged.terminationDate,
        merged.employmentStatus,
        merged.createdAt,
        merged.updatedAt,
        merged.deletedAt,
        id,
      ]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async softDelete(id: string): Promise<void> {
    await pool.query(
      'UPDATE employees SET deleted_at = $1, updated_at = $1 WHERE id = $2 AND deleted_at IS NULL',
      [new Date(), id]
    );
  }

  private mapRow(row: Record<string, unknown>): Employee {
    return {
      id: row.id as string,
      employeeNumber: row.employee_number as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      email: row.email as string,
      managerId: row.manager_id as string | null,
      department: row.department as string | null,
      hireDate: row.hire_date as Date,
      terminationDate: row.termination_date as Date | null,
      employmentStatus: row.employment_status as Employee['employmentStatus'],
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      deletedAt: row.deleted_at as Date | null,
    };
  }
}
