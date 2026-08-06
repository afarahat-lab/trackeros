import { randomUUID } from 'crypto';
import { BaseRepository } from '../../shared/base-repository';
import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';

interface EmployeeRow {
  [key: string]: unknown;
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  manager_id: string | null;
  department: string | null;
  hire_date: Date;
  termination_date: Date | null;
  employment_status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
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
    deletedAt: row.deleted_at,
  };
}

function isEmployeeRow(row: unknown): row is EmployeeRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.employee_number === 'string' &&
    typeof r.first_name === 'string' &&
    typeof r.last_name === 'string' &&
    typeof r.email === 'string' &&
    (r.manager_id === null || typeof r.manager_id === 'string') &&
    (r.department === null || typeof r.department === 'string') &&
    r.hire_date instanceof Date &&
    (r.termination_date === null || r.termination_date instanceof Date) &&
    typeof r.employment_status === 'string' &&
    ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(r.employment_status) &&
    r.created_at instanceof Date &&
    r.updated_at instanceof Date &&
    (r.deleted_at === null || r.deleted_at instanceof Date)
  );
}

class EmployeeBaseRepository extends BaseRepository {}

export class PgEmployeeRepository implements IEmployeeRepository {
  private readonly base = new EmployeeBaseRepository();
  private readonly table = 'employees';

  async findById(id: string): Promise<Employee | null> {
    const result = await this.base.query<EmployeeRow>(
      `SELECT * FROM ${this.table} WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const row = result.rows[0];
    if (!row || !isEmployeeRow(row)) return null;
    return rowToEmployee(row);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await this.base.query<EmployeeRow>(
      `SELECT * FROM ${this.table} WHERE employee_number = $1 AND deleted_at IS NULL`,
      [employeeNumber]
    );
    const row = result.rows[0];
    if (!row || !isEmployeeRow(row)) return null;
    return rowToEmployee(row);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await this.base.query<EmployeeRow>(
      `SELECT * FROM ${this.table} WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );
    const row = result.rows[0];
    if (!row || !isEmployeeRow(row)) return null;
    return rowToEmployee(row);
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await this.base.query<EmployeeRow>(
      `SELECT * FROM ${this.table} WHERE manager_id = $1 AND deleted_at IS NULL`,
      [managerId]
    );
    return result.rows.filter(isEmployeeRow).map(rowToEmployee);
  }

  async findAll(): Promise<Employee[]> {
    const result = await this.base.query<EmployeeRow>(
      `SELECT * FROM ${this.table} WHERE deleted_at IS NULL`
    );
    return result.rows.filter(isEmployeeRow).map(rowToEmployee);
  }

  async create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<Employee> {
    const id = randomUUID();
    const now = new Date();
    const data: Record<string, unknown> = {
      id,
      employee_number: employee.employeeNumber,
      first_name: employee.firstName,
      last_name: employee.lastName,
      email: employee.email,
      manager_id: employee.managerId,
      department: employee.department,
      hire_date: employee.hireDate,
      termination_date: employee.terminationDate,
      employment_status: employee.employmentStatus,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    const result = await this.base.query<EmployeeRow>(
      `INSERT INTO ${this.table} (id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        data.id,
        data.employee_number,
        data.first_name,
        data.last_name,
        data.email,
        data.manager_id,
        data.department,
        data.hire_date,
        data.termination_date,
        data.employment_status,
        data.created_at,
        data.updated_at,
        data.deleted_at,
      ]
    );
    const row = result.rows[0];
    if (!row || !isEmployeeRow(row)) {
      throw new Error('Failed to create employee');
    }
    return rowToEmployee(row);
  }

  async update(
    id: string,
    employee: Partial<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Employee | null> {
    const now = new Date();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (employee.employeeNumber !== undefined) {
      setClauses.push(`employee_number = $${paramIndex++}`);
      values.push(employee.employeeNumber);
    }
    if (employee.firstName !== undefined) {
      setClauses.push(`first_name = $${paramIndex++}`);
      values.push(employee.firstName);
    }
    if (employee.lastName !== undefined) {
      setClauses.push(`last_name = $${paramIndex++}`);
      values.push(employee.lastName);
    }
    if (employee.email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      values.push(employee.email);
    }
    if (employee.managerId !== undefined) {
      setClauses.push(`manager_id = $${paramIndex++}`);
      values.push(employee.managerId);
    }
    if (employee.department !== undefined) {
      setClauses.push(`department = $${paramIndex++}`);
      values.push(employee.department);
    }
    if (employee.hireDate !== undefined) {
      setClauses.push(`hire_date = $${paramIndex++}`);
      values.push(employee.hireDate);
    }
    if (employee.terminationDate !== undefined) {
      setClauses.push(`termination_date = $${paramIndex++}`);
      values.push(employee.terminationDate);
    }
    if (employee.employmentStatus !== undefined) {
      setClauses.push(`employment_status = $${paramIndex++}`);
      values.push(employee.employmentStatus);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(now);
    values.push(id);

    const result = await this.base.query<EmployeeRow>(
      `UPDATE ${this.table} SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    const row = result.rows[0];
    if (!row || !isEmployeeRow(row)) return null;
    return rowToEmployee(row);
  }

  async softDelete(id: string): Promise<boolean> {
    const now = new Date();
    const result = await this.base.query(
      `UPDATE ${this.table} SET deleted_at = $1, updated_at = $2 WHERE id = $3 AND deleted_at IS NULL`,
      [now, now, id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
