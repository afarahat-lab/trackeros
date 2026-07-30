import { Pool } from 'pg';
import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';
import { EmploymentStatus } from 'shared/types';

const VALID_EMPLOYMENT_STATUSES: ReadonlySet<string> = new Set(
  Object.values(EmploymentStatus)
);

function mapRowToEmployee(row: Record<string, unknown>): Employee {
  const status = row.employment_status as string;
  if (!VALID_EMPLOYMENT_STATUSES.has(status)) {
    throw new Error(`Invalid employment_status value from database: ${status}`);
  }

  return {
    id: row.id as string,
    employeeNumber: row.employee_number as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    managerId: (row.manager_id as string) ?? null,
    department: row.department as string,
    hireDate: new Date(row.hire_date as string),
    terminationDate: row.termination_date ? new Date(row.termination_date as string) : null,
    employmentStatus: status as EmploymentStatus,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class PgEmployeeRepository implements IEmployeeRepository {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findById(id: string): Promise<Employee | null> {
    try {
      const result = await this.pool.query(
        `SELECT id, employee_number, first_name, last_name, email, manager_id,
                department, hire_date, termination_date, employment_status,
                created_at, updated_at
         FROM employees
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapRowToEmployee(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PgEmployeeRepository.findById failed: ${message}`);
    }
  }

  async findByEmail(email: string): Promise<Employee | null> {
    try {
      const result = await this.pool.query(
        `SELECT id, employee_number, first_name, last_name, email, manager_id,
                department, hire_date, termination_date, employment_status,
                created_at, updated_at
         FROM employees
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapRowToEmployee(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PgEmployeeRepository.findByEmail failed: ${message}`);
    }
  }

  async findAll(): Promise<Employee[]> {
    try {
      const result = await this.pool.query(
        `SELECT id, employee_number, first_name, last_name, email, manager_id,
                department, hire_date, termination_date, employment_status,
                created_at, updated_at
         FROM employees
         ORDER BY last_name, first_name`
      );

      return result.rows.map(mapRowToEmployee);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PgEmployeeRepository.findAll failed: ${message}`);
    }
  }

  async create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Employee> {
    try {
      const result = await this.pool.query(
        `INSERT INTO employees (
           employee_number, first_name, last_name, email, manager_id,
           department, hire_date, termination_date, employment_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, employee_number, first_name, last_name, email, manager_id,
                   department, hire_date, termination_date, employment_status,
                   created_at, updated_at`,
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

      return mapRowToEmployee(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PgEmployeeRepository.create failed: ${message}`);
    }
  }

  async update(
    id: string,
    data: Partial<Employee>
  ): Promise<Employee | null> {
    try {
      const setClauses: string[] = [];
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
        if (key in data && data[key] !== undefined) {
          setClauses.push(`${column} = $${paramIndex}`);
          values.push(data[key]);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const result = await this.pool.query(
        `UPDATE employees
         SET ${setClauses.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING id, employee_number, first_name, last_name, email, manager_id,
                   department, hire_date, termination_date, employment_status,
                   created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapRowToEmployee(result.rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PgEmployeeRepository.update failed: ${message}`);
    }
  }
}
