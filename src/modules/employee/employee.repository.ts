import { randomUUID } from 'crypto';
import { Pool, PoolClient, QueryResult } from 'pg';
import { pool as defaultPool } from '../../shared/db/connection';
import { Employee, CreateEmployeeInput } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';

interface EmployeeRow {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  manager_id: string | null;
  department: string;
  hire_date: Date;
  termination_date: Date | null;
  employment_status: string;
}

function mapRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role as Employee['role'],
    managerId: row.manager_id,
    department: row.department,
    hireDate: row.hire_date,
    terminationDate: row.termination_date,
    employmentStatus: row.employment_status as Employee['employmentStatus'],
  };
}

export class PgEmployeeRepository implements IEmployeeRepository {
  constructor(private readonly dbPool: Pool = defaultPool) {}

  private db(client?: PoolClient): Pool | PoolClient {
    return client ?? this.dbPool;
  }

  async create(input: CreateEmployeeInput, client?: PoolClient): Promise<Employee> {
    const id = randomUUID();
    const query = `
      INSERT INTO employees (
        id, employee_number, first_name, last_name, email, role, manager_id,
        department, hire_date, termination_date, employment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, employee_number, first_name, last_name, email, role, manager_id,
        department, hire_date, termination_date, employment_status
    `;
    const values = [
      id,
      input.employeeNumber,
      input.firstName,
      input.lastName,
      input.email,
      input.role,
      input.managerId,
      input.department,
      input.hireDate,
      input.terminationDate,
      input.employmentStatus,
    ];
    const result: QueryResult<EmployeeRow> = await this.db(client).query(query, values);
    return mapRow(result.rows[0]);
  }

  async findById(id: string, client?: PoolClient): Promise<Employee | null> {
    const query = `
      SELECT id, employee_number, first_name, last_name, email, role, manager_id,
        department, hire_date, termination_date, employment_status
      FROM employees WHERE id = $1
    `;
    const result: QueryResult<EmployeeRow> = await this.db(client).query(query, [id]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async findByEmployeeNumber(
    employeeNumber: string,
    client?: PoolClient
  ): Promise<Employee | null> {
    const query = `
      SELECT id, employee_number, first_name, last_name, email, role, manager_id,
        department, hire_date, termination_date, employment_status
      FROM employees WHERE employee_number = $1
    `;
    const result: QueryResult<EmployeeRow> = await this.db(client).query(query, [
      employeeNumber,
    ]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }

  async findByEmail(email: string, client?: PoolClient): Promise<Employee | null> {
    const query = `
      SELECT id, employee_number, first_name, last_name, email, role, manager_id,
        department, hire_date, termination_date, employment_status
      FROM employees WHERE email = $1
    `;
    const result: QueryResult<EmployeeRow> = await this.db(client).query(query, [email]);
    return result.rows.length ? mapRow(result.rows[0]) : null;
  }
}
