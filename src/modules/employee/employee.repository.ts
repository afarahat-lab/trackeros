import { randomUUID } from 'crypto';
import type { Pool, PoolClient } from 'pg';

import { pool } from '../../shared/db';
import { EmploymentStatus } from '../../shared/types';
import { EmployeeNotFoundError, UniqueConstraintError } from './employee.errors';
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from './employee.model';

const EMPLOYEE_COLUMNS =
  'id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at';

const UNIQUE_CONSTRAINT_CODES = new Set(['23505']);

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

export interface IEmployeeRepository {
  create(input: CreateEmployeeInput, client?: PoolClient): Promise<Employee>;
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByManager(managerId: string): Promise<Employee[]>;
  update(id: string, changes: UpdateEmployeeInput, client?: PoolClient): Promise<Employee>;
  softDelete(id: string, client?: PoolClient): Promise<Employee>;
}

function mapRow(row: EmployeeRow): Employee {
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

export class EmployeeRepository implements IEmployeeRepository {
  async create(input: CreateEmployeeInput, client?: PoolClient): Promise<Employee> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    try {
      const result = await conn.query<EmployeeRow>(
        `INSERT INTO employees
           (id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL)
         RETURNING ${EMPLOYEE_COLUMNS}`,
        [
          randomUUID(),
          input.employeeNumber,
          input.firstName,
          input.lastName,
          input.email,
          input.managerId ?? null,
          input.department ?? null,
          input.hireDate,
          input.terminationDate ?? null,
          input.employmentStatus ?? EmploymentStatus.ACTIVE,
          now,
          now,
        ]
      );

      return mapRow(result.rows[0]);
    } catch (err) {
      if (isPgError(err) && UNIQUE_CONSTRAINT_CODES.has(err.code)) {
        const target = uniqueViolatedColumn(err);
        throw new UniqueConstraintError(
          `An employee with this ${target ? `'${target}'` : 'employee_number or email'} already exists`
        );
      }
      throw err;
    }
  }

  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE employee_number = $1 AND deleted_at IS NULL`,
      [employeeNumber]
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findByManager(managerId: string): Promise<Employee[]> {
    const result = await pool.query<EmployeeRow>(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE manager_id = $1 AND deleted_at IS NULL ORDER BY last_name ASC, first_name ASC`,
      [managerId]
    );

    return result.rows.map(mapRow);
  }

  async update(id: string, changes: UpdateEmployeeInput, client?: PoolClient): Promise<Employee> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const assignments: string[] = ['updated_at = $2'];
    const values: unknown[] = [id, now];
    let paramIndex = 2;

    const fields: ReadonlyArray<readonly [string, unknown]> = [
      ['employee_number', changes.employeeNumber],
      ['first_name', changes.firstName],
      ['last_name', changes.lastName],
      ['email', changes.email],
      ['manager_id', changes.managerId],
      ['department', changes.department],
      ['hire_date', changes.hireDate],
      ['termination_date', changes.terminationDate],
      ['employment_status', changes.employmentStatus],
    ];

    for (const [column, value] of fields) {
      if (value !== undefined) {
        paramIndex += 1;
        assignments.push(`${column} = $${paramIndex}`);
        values.push(value);
      }
    }

    try {
      const result = await conn.query<EmployeeRow>(
        `UPDATE employees SET ${assignments.join(', ')} WHERE id = $1 AND deleted_at IS NULL RETURNING ${EMPLOYEE_COLUMNS}`,
        values
      );

      const row = result.rows[0];
      if (!row) {
        throw new EmployeeNotFoundError(id);
      }

      return mapRow(row);
    } catch (err) {
      if (isPgError(err) && UNIQUE_CONSTRAINT_CODES.has(err.code)) {
        const target = uniqueViolatedColumn(err);
        throw new UniqueConstraintError(
          `An employee with this ${target ? `'${target}'` : 'employee_number or email'} already exists`
        );
      }
      throw err;
    }
  }

  async softDelete(id: string, client?: PoolClient): Promise<Employee> {
    const conn: Pool | PoolClient = client ?? pool;
    const now = new Date();

    const result = await conn.query<EmployeeRow>(
      `UPDATE employees SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING ${EMPLOYEE_COLUMNS}`,
      [id, now]
    );

    const row = result.rows[0];
    if (!row) {
      throw new EmployeeNotFoundError(id);
    }

    return mapRow(row);
  }
}

interface PgError {
  code: string;
  constraint?: string;
}

function isPgError(err: unknown): err is PgError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

function uniqueViolatedColumn(err: PgError): string | null {
  if (!err.constraint) {
    return null;
  }

  if (err.constraint.includes('employee_number')) {
    return 'employee_number';
  }
  if (err.constraint.includes('email')) {
    return 'email';
  }
  return null;
}
