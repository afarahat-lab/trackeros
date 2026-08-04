import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';
import { EmploymentStatus } from '../../shared/types/index';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findAll(filters?: EmployeeFilters): Promise<Employee[]>;
  create(employee: CreateEmployeeInput): Promise<Employee>;
  update(id: string, partial: UpdateEmployeeInput): Promise<Employee | null>;
  softDelete(id: string): Promise<boolean>;
}

export interface EmployeeFilters {
  employmentStatus?: EmploymentStatus;
  department?: string;
  managerId?: string;
}

export interface CreateEmployeeInput {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  department: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: EmploymentStatus;
}

export interface UpdateEmployeeInput {
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  managerId?: string | null;
  department?: string | null;
  hireDate?: Date;
  terminationDate?: Date | null;
  employmentStatus?: EmploymentStatus;
}

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

function mapRowToEmployee(row: EmployeeRow): Employee {
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
    employmentStatus: row.employment_status as EmploymentStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export class EmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToEmployee(result.rows[0] as EmployeeRow);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE email = $1 AND deleted_at IS NULL',
      [email],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToEmployee(result.rows[0] as EmployeeRow);
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
      [managerId],
    );
    return result.rows.map((row: EmployeeRow) => mapRowToEmployee(row));
  }

  async findAll(filters?: EmployeeFilters): Promise<Employee[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.employmentStatus) {
      conditions.push(`employment_status = $${paramIndex}`);
      params.push(filters.employmentStatus);
      paramIndex++;
    }
    if (filters?.department) {
      conditions.push(`department = $${paramIndex}`);
      params.push(filters.department);
      paramIndex++;
    }
    if (filters?.managerId) {
      conditions.push(`manager_id = $${paramIndex}`);
      params.push(filters.managerId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const result = await pool.query(
      `SELECT * FROM employees WHERE ${whereClause}`,
      params,
    );
    return result.rows.map((row: EmployeeRow) => mapRowToEmployee(row));
  }

  async create(employee: CreateEmployeeInput): Promise<Employee> {
    const result = await pool.query(
      `INSERT INTO employees (
        id, employee_number, first_name, last_name, email,
        manager_id, department, hire_date, termination_date,
        employment_status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, NOW(), NOW()
      ) RETURNING *`,
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
      ],
    );
    return mapRowToEmployee(result.rows[0] as EmployeeRow);
  }

  async update(id: string, partial: UpdateEmployeeInput): Promise<Employee | null> {
    const setters: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const mutableFields: (keyof UpdateEmployeeInput)[] = [
      'employeeNumber',
      'firstName',
      'lastName',
      'email',
      'managerId',
      'department',
      'hireDate',
      'terminationDate',
      'employmentStatus',
    ];

    for (const field of mutableFields) {
      if (partial[field] !== undefined) {
        const columnName = camelToSnake(field);
        setters.push(`${columnName} = $${paramIndex}`);
        params.push(partial[field]);
        paramIndex++;
      }
    }

    if (setters.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    setters.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE employees SET ${setters.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      params,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToEmployee(result.rows[0] as EmployeeRow);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE employees SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
