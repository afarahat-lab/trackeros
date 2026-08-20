import { pool } from '../../shared/db/connection';
import { Employee, IEmployeeRepository } from './employee.model';

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
    employmentStatus: row.employment_status as Employee['employmentStatus'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

const COLUMN_MAP: Record<string, string> = {
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

export class PgEmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToEmployee(result.rows[0]);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
      [employeeNumber],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToEmployee(result.rows[0]);
  }

  async findAll(): Promise<Employee[]> {
    const result = await pool.query<EmployeeRow>(
      'SELECT * FROM employees WHERE deleted_at IS NULL',
    );
    return result.rows.map(mapRowToEmployee);
  }

  async create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Employee> {
    const result = await pool.query<EmployeeRow>(
      `INSERT INTO employees (
        employee_number, first_name, last_name, email,
        manager_id, department, hire_date, termination_date, employment_status
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
      ],
    );
    return mapRowToEmployee(result.rows[0]);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const keys = Object.keys(data).filter(
      (k) =>
        data[k as keyof typeof data] !== undefined &&
        COLUMN_MAP[k] !== undefined,
    );

    if (keys.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    const setClauses = keys.map(
      (key, index) => `${COLUMN_MAP[key]} = $${index + 2}`,
    );
    const values = keys.map((key) => data[key as keyof typeof data]);

    const result = await pool.query<EmployeeRow>(
      `UPDATE employees SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...values],
    );

    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToEmployee(result.rows[0]);
  }

  async softDelete(id: string): Promise<void> {
    await pool.query(
      'UPDATE employees SET deleted_at = NOW() WHERE id = $1',
      [id],
    );
  }
}
