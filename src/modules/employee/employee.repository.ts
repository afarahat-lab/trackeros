import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';

function rowToEmployee(row: any): Employee {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    employmentStatus: row.employment_status,
    managerId: row.manager_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PgEmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    try {
      const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return rowToEmployee(result.rows[0]);
    } catch (error) {
      throw new Error(
        `Failed to find employee by id: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findByEmail(email: string): Promise<Employee | null> {
    try {
      const result = await pool.query('SELECT * FROM employees WHERE email = $1', [email]);
      if (result.rows.length === 0) return null;
      return rowToEmployee(result.rows[0]);
    } catch (error) {
      throw new Error(
        `Failed to find employee by email: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findAll(): Promise<Employee[]> {
    try {
      const result = await pool.query('SELECT * FROM employees');
      return result.rows.map(rowToEmployee);
    } catch (error) {
      throw new Error(
        `Failed to find all employees: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    try {
      const result = await pool.query(
        `INSERT INTO employees (first_name, last_name, email, employment_status, manager_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [employee.firstName, employee.lastName, employee.email, employee.employmentStatus, employee.managerId]
      );
      return rowToEmployee(result.rows[0]);
    } catch (error) {
      throw new Error(
        `Failed to create employee: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.firstName !== undefined) {
        fields.push(`first_name = $${paramIndex++}`);
        values.push(data.firstName);
      }
      if (data.lastName !== undefined) {
        fields.push(`last_name = $${paramIndex++}`);
        values.push(data.lastName);
      }
      if (data.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        values.push(data.email);
      }
      if (data.employmentStatus !== undefined) {
        fields.push(`employment_status = $${paramIndex++}`);
        values.push(data.employmentStatus);
      }
      if (data.managerId !== undefined) {
        fields.push(`manager_id = $${paramIndex++}`);
        values.push(data.managerId);
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const query = `UPDATE employees SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, values);
      if (result.rows.length === 0) return null;
      return rowToEmployee(result.rows[0]);
    } catch (error) {
      throw new Error(
        `Failed to update employee: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
