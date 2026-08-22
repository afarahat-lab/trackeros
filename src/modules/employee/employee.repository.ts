import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';

export class EmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query<Employee>(
      'SELECT id, full_name AS "fullName", email, department, manager_id AS "managerId", created_at AS "createdAt", updated_at AS "updatedAt" FROM employees WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await pool.query<Employee>(
      'SELECT id, full_name AS "fullName", email, department, manager_id AS "managerId", created_at AS "createdAt", updated_at AS "updatedAt" FROM employees WHERE email = $1',
      [email]
    );
    return result.rows[0] ?? null;
  }

  async findByDepartment(department: string): Promise<Employee[]> {
    const result = await pool.query<Employee>(
      'SELECT id, full_name AS "fullName", email, department, manager_id AS "managerId", created_at AS "createdAt", updated_at AS "updatedAt" FROM employees WHERE department = $1',
      [department]
    );
    return result.rows;
  }
}
