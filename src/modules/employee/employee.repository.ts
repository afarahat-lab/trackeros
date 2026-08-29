import type { PoolClient } from 'pg';

import { pool } from '../../shared/db/connection';
import {
  Employee,
  EmploymentStatus,
  IEmployeeRepository
} from './employee.model';

const COLUMNS = [
  'id',
  'employee_number',
  'first_name',
  'last_name',
  'email',
  'manager_id',
  'department',
  'hire_date',
  'termination_date',
  'employment_status'
] as const;

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
}

function isEmploymentStatus(value: string): value is EmploymentStatus {
  return value === 'ACTIVE' || value === 'INACTIVE' || value === 'TERMINATED';
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
    employmentStatus: isEmploymentStatus(row.employment_status)
      ? row.employment_status
      : 'ACTIVE'
  };
}

export class PgEmployeeRepository implements IEmployeeRepository {
  async create(employee: Employee, client?: PoolClient): Promise<Employee> {
    const db = client ?? pool;
    const result = await db.query(
      `INSERT INTO employees (
         id, employee_number, first_name, last_name, email,
         manager_id, department, hire_date, termination_date, employment_status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, employee_number, first_name, last_name, email,
         manager_id, department, hire_date, termination_date, employment_status`,
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
        employee.employmentStatus
      ]
    );
    return mapRow(result.rows[0] as EmployeeRow);
  }

  async update(employee: Employee, client?: PoolClient): Promise<Employee> {
    const db = client ?? pool;
    const result = await db.query(
      `UPDATE employees
       SET employee_number = $2, first_name = $3, last_name = $4, email = $5,
           manager_id = $6, department = $7, hire_date = $8,
           termination_date = $9, employment_status = $10
       WHERE id = $1
       RETURNING id, employee_number, first_name, last_name, email,
         manager_id, department, hire_date, termination_date, employment_status`,
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
        employee.employmentStatus
      ]
    );
    return mapRow(result.rows[0] as EmployeeRow);
  }

  async findById(id: string, client?: PoolClient): Promise<Employee | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, employee_number, first_name, last_name, email,
         manager_id, department, hire_date, termination_date, employment_status
       FROM employees WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] as EmployeeRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByEmployeeNumber(
    employeeNumber: string,
    client?: PoolClient
  ): Promise<Employee | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, employee_number, first_name, last_name, email,
         manager_id, department, hire_date, termination_date, employment_status
       FROM employees WHERE employee_number = $1`,
      [employeeNumber]
    );
    const row = result.rows[0] as EmployeeRow | undefined;
    return row ? mapRow(row) : null;
  }

  async findByEmail(email: string, client?: PoolClient): Promise<Employee | null> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, employee_number, first_name, last_name, email,
         manager_id, department, hire_date, termination_date, employment_status
       FROM employees WHERE email = $1`,
      [email]
    );
    const row = result.rows[0] as EmployeeRow | undefined;
    return row ? mapRow(row) : null;
  }

  async list(client?: PoolClient): Promise<Employee[]> {
    const db = client ?? pool;
    const result = await db.query(
      `SELECT id, employee_number, first_name, last_name, email,
         manager_id, department, hire_date, termination_date, employment_status
       FROM employees ORDER BY employee_number`
    );
    return (result.rows as EmployeeRow[]).map(mapRow);
  }
}
