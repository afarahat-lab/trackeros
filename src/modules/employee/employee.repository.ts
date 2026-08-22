import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';

interface EmployeeRow {
  id: string;
  full_name: string;
  email: string;
  department: string;
  manager_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    department: row.department,
    managerId: row.manager_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class EmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      'SELECT id, full_name, email, department, manager_id, created_at, updated_at FROM employees WHERE id = $1',
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRow(result.rows[0]);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await pool.query<EmployeeRow>(
      'SELECT id, full_name, email, department, manager_id, created_at, updated_at FROM employees WHERE email = $1',
      [email],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRow(result.rows[0]);
  }

  async findByDepartment(department: string): Promise<Employee[]> {
    const result = await pool.query<EmployeeRow>(
      'SELECT id, full_name, email, department, manager_id, created_at, updated_at FROM employees WHERE department = $1',
      [department],
    );
    return result.rows.map(mapRow);
  }
}
