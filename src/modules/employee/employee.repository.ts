import { pool } from '../../shared/db/connection';
import { Employee, IEmployeeRepository } from './employee.model';

export class PgEmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at FROM employees WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEmployee(result.rows[0]);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await pool.query(
      'SELECT id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at FROM employees WHERE employee_number = $1',
      [employeeNumber]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEmployee(result.rows[0]);
  }

  async findAll(): Promise<Employee[]> {
    const result = await pool.query(
      'SELECT id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at FROM employees WHERE deleted_at IS NULL'
    );
    return result.rows.map((row: Record<string, unknown>) => this.mapRowToEmployee(row));
  }

  async create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee> {
    const result = await pool.query(
      `INSERT INTO employees (employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at`,
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
      ]
    );
    return this.mapRowToEmployee(result.rows[0]);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Array<{ key: keyof Employee; column: string }> = [
      { key: 'employeeNumber', column: 'employee_number' },
      { key: 'firstName', column: 'first_name' },
      { key: 'lastName', column: 'last_name' },
      { key: 'email', column: 'email' },
      { key: 'managerId', column: 'manager_id' },
      { key: 'department', column: 'department' },
      { key: 'hireDate', column: 'hire_date' },
      { key: 'terminationDate', column: 'termination_date' },
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
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status, created_at, updated_at, deleted_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEmployee(result.rows[0]);
  }

  async softDelete(id: string): Promise<void> {
    await pool.query('UPDATE employees SET deleted_at = NOW() WHERE id = $1', [id]);
  }

  private mapRowToEmployee(row: Record<string, unknown>): Employee {
    return {
      id: row.id as string,
      employeeNumber: row.employee_number as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      email: row.email as string,
      managerId: row.manager_id as string | null,
      department: row.department as string | null,
      hireDate: new Date(row.hire_date as string),
      terminationDate: row.termination_date ? new Date(row.termination_date as string) : null,
      employmentStatus: row.employment_status as Employee['employmentStatus'],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
    };
  }
}
