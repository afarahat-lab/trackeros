import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string, client?: PoolClient): Promise<Employee | null>;
  findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]>;
  findAll(client?: PoolClient): Promise<Employee[]>;
  create(
    input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
    client?: PoolClient,
  ): Promise<Employee>;
  update(
    id: string,
    updates: Partial<
      Pick<
        Employee,
        | 'firstName'
        | 'lastName'
        | 'email'
        | 'managerId'
        | 'department'
        | 'hireDate'
        | 'terminationDate'
        | 'employmentStatus'
      >
    >,
    client?: PoolClient,
  ): Promise<Employee | null>;
  softDelete(id: string, client?: PoolClient): Promise<Employee | null>;
}

export class PgEmployeeRepository implements IEmployeeRepository {
  async findById(id: string, client?: PoolClient): Promise<Employee | null> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToEmployee(result.rows[0]);
  }

  async findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
      [managerId],
    );
    return result.rows.map((row) => this.rowToEmployee(row));
  }

  async findAll(client?: PoolClient): Promise<Employee[]> {
    const db = client ?? pool;
    const result = await db.query(
      'SELECT * FROM employees WHERE deleted_at IS NULL',
    );
    return result.rows.map((row) => this.rowToEmployee(row));
  }

  async create(
    input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
    client?: PoolClient,
  ): Promise<Employee> {
    const db = client ?? pool;
    try {
      const result = await db.query(
        `INSERT INTO employees (
          employee_number, first_name, last_name, email, manager_id,
          department, hire_date, termination_date, employment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          input.employeeNumber,
          input.firstName,
          input.lastName,
          input.email,
          input.managerId,
          input.department,
          input.hireDate,
          input.terminationDate,
          input.employmentStatus,
        ],
      );
      return this.rowToEmployee(result.rows[0]);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new UniqueConstraintViolationError(
          'Unique constraint violation on employee_number or email',
          error,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    updates: Partial<
      Pick<
        Employee,
        | 'firstName'
        | 'lastName'
        | 'email'
        | 'managerId'
        | 'department'
        | 'hireDate'
        | 'terminationDate'
        | 'employmentStatus'
      >
    >,
    client?: PoolClient,
  ): Promise<Employee | null> {
    const db = client ?? pool;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      managerId: 'manager_id',
      department: 'department',
      hireDate: 'hire_date',
      terminationDate: 'termination_date',
      employmentStatus: 'employment_status',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (key in updates) {
        setClauses.push(`${column} = $${paramIndex}`);
        values.push((updates as Record<string, unknown>)[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      const existing = await this.findById(id, client);
      return existing;
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(id);

    const result = await db.query(
      `UPDATE employees
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToEmployee(result.rows[0]);
  }

  async softDelete(id: string, client?: PoolClient): Promise<Employee | null> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE employees
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.rowToEmployee(result.rows[0]);
  }

  private rowToEmployee(row: Record<string, unknown>): Employee {
    return {
      id: row.id as string,
      employeeNumber: row.employee_number as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      email: row.email as string,
      managerId: (row.manager_id as string) ?? null,
      department: (row.department as string) ?? null,
      hireDate: new Date(row.hire_date as string),
      terminationDate: row.termination_date
        ? new Date(row.termination_date as string)
        : null,
      employmentStatus: row.employment_status as Employee['employmentStatus'],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deletedAt: row.deleted_at
        ? new Date(row.deleted_at as string)
        : null,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as Record<string, unknown>).code === '23505'
    );
  }
}

export class UniqueConstraintViolationError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'UniqueConstraintViolationError';
    this.cause = cause;
  }
}
