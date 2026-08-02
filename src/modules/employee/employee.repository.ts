import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

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

const READ_ONLY_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt']);

function rowToEmployee(row: Record<string, unknown>): Employee {
  return {
    id: row.id as string,
    employeeNumber: row.employee_number as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    managerId: (row.manager_id as string) ?? null,
    department: (row.department as string) ?? null,
    hireDate: new Date(row.hire_date as string),
    terminationDate: row.termination_date ? new Date(row.termination_date as string) : null,
    employmentStatus: row.employment_status as 'ACTIVE' | 'INACTIVE' | 'TERMINATED',
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
  };
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findAll(): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
  softDelete(id: string): Promise<void>;
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
    return rowToEmployee(result.rows[0]);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE employee_number = $1 AND deleted_at IS NULL',
      [employeeNumber],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEmployee(result.rows[0]);
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL',
      [managerId],
    );
    return result.rows.map(rowToEmployee);
  }

  async findAll(): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE deleted_at IS NULL',
    );
    return result.rows.map(rowToEmployee);
  }

  async create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee> {
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
      ],
    );
    return rowToEmployee(result.rows[0]);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const keys = Object.keys(data).filter((k) => !READ_ONLY_FIELDS.has(k));
    if (keys.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    const setClauses = keys.map((key, index) => {
      const column = COLUMN_MAP[key] ?? key;
      return `${column} = $${index + 2}`;
    });
    const values = keys.map((key) => (data as Record<string, unknown>)[key]);

    const result = await pool.query(
      `UPDATE employees SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, ...values],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return rowToEmployee(result.rows[0]);
  }

  async softDelete(id: string): Promise<void> {
    await pool.query(
      'UPDATE employees SET deleted_at = NOW() WHERE id = $1',
      [id],
    );
  }
}
