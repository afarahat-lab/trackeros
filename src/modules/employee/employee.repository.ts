import { pool } from '../../shared/db/connection';
import { Employee, IEmployeeRepository } from './employee.model';

export class EmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  async findByDepartment(department: string): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees WHERE department = $1 ORDER BY last_name, first_name',
      [department],
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async findAll(): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT * FROM employees ORDER BY last_name, first_name',
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  async create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Employee> {
    const result = await pool.query(
      `INSERT INTO employees (first_name, last_name, email, role, manager_id, department, employment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.role,
        employee.managerId,
        employee.department,
        employee.employmentStatus,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<{ key: keyof Employee; column: string }> = [
      { key: 'firstName', column: 'first_name' },
      { key: 'lastName', column: 'last_name' },
      { key: 'email', column: 'email' },
      { key: 'role', column: 'role' },
      { key: 'managerId', column: 'manager_id' },
      { key: 'department', column: 'department' },
      { key: 'employmentStatus', column: 'employment_status' },
    ];

    for (const { key, column } of fieldMap) {
      if (data[key] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): Employee {
    return {
      id: row.id as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      email: row.email as string,
      role: row.role as string,
      managerId: row.manager_id as string | null,
      department: row.department as string,
      employmentStatus: row.employment_status as Employee['employmentStatus'],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
