import knex, { Knex } from 'knex';
import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

interface EmployeeRow {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  manager_id: string | null;
  department: string | null;
  hire_date: Date;
  termination_date: Date | null;
  employment_status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    managerId: row.manager_id,
    department: row.department,
    hireDate: row.hire_date,
    terminationDate: row.termination_date,
    employmentStatus: row.employment_status as Employee['employmentStatus'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
  softDelete(id: string): Promise<void>;
}

export class EmployeeRepository implements IEmployeeRepository {
  private readonly db: Knex;

  constructor() {
    this.db = knex({ client: 'pg', pool: pool as unknown as Knex.Config['pool'] });
  }

  async findById(id: string): Promise<Employee | null> {
    const result = await this.db.raw<{ rows: EmployeeRow[] }>(
      'SELECT * FROM employees WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return result.rows[0] ? toEmployee(result.rows[0]) : null;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await this.db.raw<{ rows: EmployeeRow[] }>(
      'SELECT * FROM employees WHERE employee_number = ? AND deleted_at IS NULL',
      [employeeNumber],
    );
    return result.rows[0] ? toEmployee(result.rows[0]) : null;
  }

  async findAll(): Promise<Employee[]> {
    const result = await this.db.raw<{ rows: EmployeeRow[] }>(
      'SELECT * FROM employees WHERE deleted_at IS NULL',
    );
    return result.rows.map(toEmployee);
  }

  async create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Employee> {
    const now = new Date();
    const result = await this.db.raw<{ rows: EmployeeRow[] }>(
      `INSERT INTO employees (
        employee_number, first_name, last_name, email, manager_id,
        department, hire_date, termination_date, employment_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      ],
    );
    return toEmployee(result.rows[0]);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const fields: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];

    const columnMap: Record<string, string> = {
      employeeNumber: 'employee_number',
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      managerId: 'manager_id',
      department: 'department',
      hireDate: 'hire_date',
      terminationDate: 'termination_date',
      employmentStatus: 'employment_status',
    };

    for (const [key, col] of Object.entries(columnMap)) {
      if (key in data) {
        fields.push(`${col} = ?`);
        const val = (data as Record<string, unknown>)[key];
        if (val !== undefined) {
          values.push(val as string | number | boolean | Date | null);
        }
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const result = await this.db.raw<{ rows: EmployeeRow[] }>(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL RETURNING *`,
      values,
    );
    return result.rows[0] ? toEmployee(result.rows[0]) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.raw(
      'UPDATE employees SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      [new Date(), new Date(), id],
    );
  }
}
