import { Pool } from 'pg';
import { pool } from 'shared/db/connection';
import { Employee } from './employee.model';

interface EmployeeRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  manager_id: string | null;
  department: string;
  employment_status: string;
  created_at: Date;
  updated_at: Date;
}

function isEmployeeRow(row: unknown): row is EmployeeRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.email === 'string' &&
    typeof r.full_name === 'string' &&
    typeof r.role === 'string' &&
    (r.manager_id === null || typeof r.manager_id === 'string') &&
    typeof r.department === 'string' &&
    typeof r.employment_status === 'string' &&
    r.created_at instanceof Date &&
    r.updated_at instanceof Date
  );
}

function mapRowToEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    managerId: row.manager_id,
    department: row.department,
    employmentStatus: row.employment_status as Employee['employmentStatus'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findManagerId(employeeId: string): Promise<string | null>;
  findHrAdmins(): Promise<Employee[]>;
}

export class EmployeeRepository implements IEmployeeRepository {
  private readonly db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findById(id: string): Promise<Employee | null> {
    const result = await this.db.query(
      'SELECT id, email, full_name, role, manager_id, department, employment_status, created_at, updated_at FROM employees WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!isEmployeeRow(row)) return null;
    return mapRowToEmployee(row);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await this.db.query(
      'SELECT id, email, full_name, role, manager_id, department, employment_status, created_at, updated_at FROM employees WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!isEmployeeRow(row)) return null;
    return mapRowToEmployee(row);
  }

  async findManagerId(employeeId: string): Promise<string | null> {
    const result = await this.db.query(
      'SELECT manager_id FROM employees WHERE id = $1',
      [employeeId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0] as Record<string, unknown>;
    return row.manager_id === null || row.manager_id === undefined ? null : String(row.manager_id);
  }

  async findHrAdmins(): Promise<Employee[]> {
    const result = await this.db.query(
      "SELECT id, email, full_name, role, manager_id, department, employment_status, created_at, updated_at FROM employees WHERE role = 'HR_ADMIN'"
    );
    return result.rows.filter(isEmployeeRow).map(mapRowToEmployee);
  }
}
