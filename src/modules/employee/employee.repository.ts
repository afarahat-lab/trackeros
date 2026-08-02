import { randomUUID } from 'crypto';
import { pool } from '../../shared/db/connection';
import type { Employee } from './employee.model';

interface EmployeeRow {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  manager_id: string | null;
  department: string;
  hire_date: Date;
  termination_date: Date | null;
  employment_status: string;
  created_at: Date;
  updated_at: Date;
}

function rowToEmployee(row: EmployeeRow): Employee {
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
  };
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findAll(): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
}

export class PgEmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      'SELECT * FROM employees WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEmployee(result.rows[0]);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      'SELECT * FROM employees WHERE employee_number = $1',
      [employeeNumber],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEmployee(result.rows[0]);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      'SELECT * FROM employees WHERE email = $1',
      [email],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEmployee(result.rows[0]);
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await pool.query<EmployeeRow>(
      'SELECT * FROM employees WHERE manager_id = $1',
      [managerId],
    );
    return result.rows.map(rowToEmployee);
  }

  async findAll(): Promise<Employee[]> {
    const result = await pool.query<EmployeeRow>('SELECT * FROM employees');
    return result.rows.map(rowToEmployee);
  }

  async create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Employee> {
    const id = randomUUID();
    const now = new Date();
    const result = await pool.query<EmployeeRow>(
      `INSERT INTO employees (
        id, employee_number, first_name, last_name, email,
        manager_id, department, hire_date, termination_date,
        employment_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
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
    return rowToEmployee(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<Employee>,
  ): Promise<Employee | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const merged = { ...existing, ...data, id, updatedAt: new Date() };

    const result = await pool.query<EmployeeRow>(
      `UPDATE employees SET
        employee_number = $1,
        first_name = $2,
        last_name = $3,
        email = $4,
        manager_id = $5,
        department = $6,
        hire_date = $7,
        termination_date = $8,
        employment_status = $9,
        updated_at = $10
      WHERE id = $11
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
        merged.updatedAt,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return rowToEmployee(result.rows[0]);
  }
}
