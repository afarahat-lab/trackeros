import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import {
  Employee,
  EmploymentStatus,
  IEmployeeRepository,
} from './employee.model';

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
  employment_status: EmploymentStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

const COLUMNS: Partial<Record<keyof Employee, string>> = {
  employeeNumber: 'employee_number',
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  managerId: 'manager_id',
  department: 'department',
  hireDate: 'hire_date',
  terminationDate: 'termination_date',
  employmentStatus: 'employment_status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
};

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
    employmentStatus: row.employment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export class PgEmployeeRepository implements IEmployeeRepository {
  async create(employee: Employee, client?: PoolClient): Promise<Employee> {
    const db = client ?? pool;
    const result = await db.query<EmployeeRow>(
      `INSERT INTO employees (
         id, employee_number, first_name, last_name, email, manager_id,
         department, hire_date, termination_date, employment_status,
         created_at, updated_at, deleted_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
      ],
    );
    return toEmployee(result.rows[0]);
  }

  async list(client?: PoolClient): Promise<Employee[]> {
    const db = client ?? pool;
    const result = await db.query<EmployeeRow>(
      `SELECT * FROM employees WHERE deleted_at IS NULL ORDER BY created_at ASC`,
    );
    return result.rows.map(toEmployee);
  }

  async findById(id: string, client?: PoolClient): Promise<Employee | null> {
    const db = client ?? pool;
    const result = await db.query<EmployeeRow>(
      `SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ? toEmployee(result.rows[0]) : null;
  }

  async findByEmployeeNumber(
    employeeNumber: string,
    client?: PoolClient,
  ): Promise<Employee | null> {
    const db = client ?? pool;
    const result = await db.query<EmployeeRow>(
      `SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL`,
      [employeeNumber],
    );
    return result.rows[0] ? toEmployee(result.rows[0]) : null;
  }

  async findByEmail(email: string, client?: PoolClient): Promise<Employee | null> {
    const db = client ?? pool;
    const result = await db.query<EmployeeRow>(
      `SELECT * FROM employees WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );
    return result.rows[0] ? toEmployee(result.rows[0]) : null;
  }

  async update(
    id: string,
    changes: Partial<Employee>,
    client?: PoolClient,
  ): Promise<Employee | null> {
    const entries = (Object.entries(changes) as [keyof Employee, unknown][]).filter(
      ([key]) => key !== 'id' && COLUMNS[key] !== undefined,
    );

    if (entries.length === 0) {
      return this.findById(id, client);
    }

    const db = client ?? pool;
    const setClause = entries
      .map(([key], index) => `${COLUMNS[key]} = $${index + 1}`)
      .join(', ');
    const values = entries.map(([, value]) => value);

    const result = await db.query<EmployeeRow>(
      `UPDATE employees
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${entries.length + 1} AND deleted_at IS NULL
       RETURNING *`,
      [...values, id],
    );
    return result.rows[0] ? toEmployee(result.rows[0]) : null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE employees
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
