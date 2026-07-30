import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

interface EmployeeRow {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  manager_id: string | null;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function isEmployeeRow(row: unknown): row is EmployeeRow {
  if (typeof row !== 'object' || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.employee_code === 'string' &&
    typeof r.first_name === 'string' &&
    typeof r.last_name === 'string' &&
    typeof r.email === 'string' &&
    (r.manager_id === null || typeof r.manager_id === 'string') &&
    typeof r.role === 'string' &&
    typeof r.is_active === 'boolean' &&
    r.created_at instanceof Date &&
    r.updated_at instanceof Date
  );
}

function isValidRole(role: string): role is Employee['role'] {
  return role === 'EMPLOYEE' || role === 'MANAGER' || role === 'HR_ADMIN';
}

function mapRowToEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    managerId: row.manager_id,
    role: isValidRole(row.role) ? row.role : 'EMPLOYEE',
    isActive: row.is_active,
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
      'SELECT id, employee_code, first_name, last_name, email, manager_id, role, is_active, created_at, updated_at FROM employees WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!isEmployeeRow(row)) return null;
    return mapRowToEmployee(row);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await this.db.query(
      'SELECT id, employee_code, first_name, last_name, email, manager_id, role, is_active, created_at, updated_at FROM employees WHERE email = $1',
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
      "SELECT id, employee_code, first_name, last_name, email, manager_id, role, is_active, created_at, updated_at FROM employees WHERE role = 'HR_ADMIN'"
    );
    return result.rows.filter(isEmployeeRow).map(mapRowToEmployee);
  }
}
