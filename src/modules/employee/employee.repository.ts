import { Pool, QueryResult } from 'pg';
import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
}

function rowToEmployee(row: Record<string, unknown>): Employee {
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
    employmentStatus: row.employment_status as 'ACTIVE' | 'INACTIVE' | 'TERMINATED',
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class EmployeeRepository implements IEmployeeRepository {
  private readonly db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  async findById(id: string): Promise<Employee | null> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM employees WHERE id = $1',
        [id],
      );
      if (result.rows.length === 0) {
        return null;
      }
      return rowToEmployee(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find employee by id: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    try {
      const result: QueryResult = await this.db.query(
        'SELECT * FROM employees WHERE employee_number = $1',
        [employeeNumber],
      );
      if (result.rows.length === 0) {
        return null;
      }
      return rowToEmployee(result.rows[0] as Record<string, unknown>);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find employee by employee number: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findAll(): Promise<Employee[]> {
    try {
      const result: QueryResult = await this.db.query('SELECT * FROM employees');
      return (result.rows as Record<string, unknown>[]).map(rowToEmployee);
    } catch (error: unknown) {
      throw new Error(
        `Failed to find all employees: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
