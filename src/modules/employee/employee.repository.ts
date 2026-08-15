import { Pool, PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
  softDelete(id: string): Promise<void>;
}

function rowToEmployee(row: Record<string, unknown>): Employee {
  return {
    id: row.id as string,
    employeeNumber: row.employee_number as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    managerId: row.manager_id as string | null,
    department: row.department as string | null,
    hireDate: new Date(row.hire_date as string),
    terminationDate: row.termination_date ? new Date(row.termination_date as string) : null,
    employmentStatus: row.employment_status as 'ACTIVE' | 'INACTIVE' | 'TERMINATED',
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
  };
}

export class EmployeeRepository implements IEmployeeRepository {
  private readonly db: Pool | PoolClient;

  constructor(client?: Pool | PoolClient) {
    this.db = client ?? pool;
  }

  async findById(id: string): Promise<Employee | null> {
    const result = await this.db.query(
      'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEmployee(result.rows[0]);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await this.db.query(
      'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
      [employeeNumber],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEmployee(result.rows[0]);
  }

  async findAll(): Promise<Employee[]> {
    const result = await this.db.query(
      'SELECT * FROM employees WHERE deleted_at IS NULL ORDER BY employee_number',
    );
    return result.rows.map(rowToEmployee);
  }

  async create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Employee> {
    const now = new Date();
    const result = await this.db.query(
      `INSERT INTO employees (
        employee_number, first_name, last_name, email, manager_id,
        department, hire_date, termination_date, employment_status,
        created_at, updated_at, deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        now,
        now,
        null,
      ],
    );
    return rowToEmployee(result.rows[0]);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<{ key: keyof Employee; column: string }> = [
      { key: 'employeeNumber', column: 'employee_number' },
      { key: 'firstName', column: 'first_name' },
      { key: 'lastName', column: 'last_name' },
      { key: 'email', column: 'email' },
      { key: 'managerId', column: 'manager_id' },
      { key: 'department', column: 'department' },
      { key: 'hireDate', column: 'hire_date' },
      { key: 'terminationDate', column: 'termination_date' },
      { key: 'employmentStatus', column: 'employment_status' },
    ];

    for (const { key, column } of fieldMap) {
      if (key in data) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    values.push(id);

    const result = await this.db.query(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToEmployee(result.rows[0]);
  }

  async softDelete(id: string): Promise<void> {
    await this.db.query(
      'UPDATE employees SET deleted_at = $1, updated_at = $2 WHERE id = $3 AND deleted_at IS NULL',
      [new Date(), new Date(), id],
    );
  }
}
