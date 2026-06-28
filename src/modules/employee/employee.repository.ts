import { Pool } from 'pg';
import { pool } from '../../shared/db/connection';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findAll(): Promise<Employee[]>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: string, dto: UpdateEmployeeDto): Promise<Employee>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly db: Pool = pool) {}

  async findById(id: string): Promise<Employee | null> {
    const result = await this.db.query<Employee>(
      'SELECT * FROM employees WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await this.db.query<Employee>(
      'SELECT * FROM employees WHERE manager_id = $1',
      [managerId]
    );
    return result.rows;
  }

  async findAll(): Promise<Employee[]> {
    const result = await this.db.query<Employee>('SELECT * FROM employees');
    return result.rows;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const { name, email, managerId, department, employmentDate } = dto;
    const result = await this.db.query<Employee>(
      `INSERT INTO employees (name, email, manager_id, department, employment_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email, managerId ?? null, department ?? null, employmentDate]
    );
    return result.rows[0];
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const { name, email, managerId, department, employmentDate } = dto;
    const result = await this.db.query<Employee>(
      `UPDATE employees
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           manager_id = COALESCE($3, manager_id),
           department = COALESCE($4, department),
           employment_date = COALESCE($5, employment_date),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, email, managerId, department, employmentDate, id]
    );
    return result.rows[0];
  }
}
