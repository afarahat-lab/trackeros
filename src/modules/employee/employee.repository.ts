import { pool } from 'shared/db/connection';
import {
  Employee,
  IEmployeeRepository,
  DuplicateEmployeeNumberError,
} from './employee.model';

type DbRow = Record<string, unknown>;

export class EmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
      [employeeNumber]
    );
    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findAll(): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE deleted_at IS NULL'
    );
    const rows = result.rows as DbRow[];
    return rows.map((row) => this.mapRow(row));
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
      [managerId]
    );
    const rows = result.rows as DbRow[];
    return rows.map((row) => this.mapRow(row));
  }

  async create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<Employee> {
    const existing = await this.findByEmployeeNumber(employee.employeeNumber);
    if (existing) {
      throw new DuplicateEmployeeNumberError(employee.employeeNumber);
    }

    const result = await pool.query(
      `INSERT INTO employees (
        employee_number, first_name, last_name, email, manager_id,
        department, hire_date, termination_date, employment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        employee.employeeNumber,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.managerId,
        employee.department,
        employee.hireDate,
        employee.terminationDate,
        employee.employmentStatus,
      ]
    );
    const rows = result.rows as DbRow[];
    return this.mapRow(rows[0]);
  }

  async update(
    id: string,
    data: Partial<Employee>
  ): Promise<Employee | null> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Array<[string, keyof Employee]> = [
      ['employee_number', 'employeeNumber'],
      ['first_name', 'firstName'],
      ['last_name', 'lastName'],
      ['email', 'email'],
      ['manager_id', 'managerId'],
      ['department', 'department'],
      ['hire_date', 'hireDate'],
      ['termination_date', 'terminationDate'],
      ['employment_status', 'employmentStatus'],
      ['deleted_at', 'deletedAt'],
      ['updated_at', 'updatedAt'],
    ];

    for (const [col, key] of fieldMap) {
      if (key in data) {
        clauses.push(`${col} = $${idx}`);
        values.push(data[key]);
        idx++;
      }
    }

    if (clauses.length === 0) {
      return this.findById(id);
    }

    clauses.push(`updated_at = NOW()`);

    values.push(id);
    const result = await pool.query(
      `UPDATE employees SET ${clauses.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );

    const rows = result.rows as DbRow[];
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async softDelete(id: string): Promise<void> {
    await pool.query(
      'UPDATE employees SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
  }

  private mapRow(row: DbRow): Employee {
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
