import { Pool } from 'pg';
import { BaseRepository } from '../../shared/base.repository';
import { Employee } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findAll(filters?: Record<string, unknown>): Promise<Employee[]>;
  create(entity: Partial<Employee>): Promise<Employee>;
  update(id: string, updates: Partial<Employee>): Promise<Employee>;
  delete(id: string): Promise<void>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findByDepartment(department: string): Promise<Employee[]>;
}

export class EmployeeRepository extends BaseRepository<Employee> implements IEmployeeRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  async findById(id: string): Promise<Employee | null> {
    const result = await this.pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Employee[]> {
    const result = await this.pool.query('SELECT * FROM employees');
    return result.rows;
  }

  async create(entity: Partial<Employee>): Promise<Employee> {
    const result = await this.pool.query(
      `INSERT INTO employees (employee_number, first_name, last_name, email, manager_id, department, hire_date, termination_date, employment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        entity.employeeNumber,
        entity.firstName,
        entity.lastName,
        entity.email,
        entity.managerId,
        entity.department,
        entity.hireDate,
        entity.terminationDate,
        entity.employmentStatus,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    const result = await this.pool.query(
      `UPDATE employees SET
        employee_number = COALESCE($1, employee_number),
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        email = COALESCE($4, email),
        manager_id = COALESCE($5, manager_id),
        department = COALESCE($6, department),
        hire_date = COALESCE($7, hire_date),
        termination_date = COALESCE($8, termination_date),
        employment_status = COALESCE($9, employment_status),
        updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [
        updates.employeeNumber,
        updates.firstName,
        updates.lastName,
        updates.email,
        updates.managerId,
        updates.department,
        updates.hireDate,
        updates.terminationDate,
        updates.employmentStatus,
        id,
      ]
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM employees WHERE id = $1', [id]);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await this.pool.query(
      'SELECT * FROM employees WHERE employee_number = $1',
      [employeeNumber]
    );
    return result.rows[0] ?? null;
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await this.pool.query(
      'SELECT * FROM employees WHERE manager_id = $1',
      [managerId]
    );
    return result.rows;
  }

  async findByDepartment(department: string): Promise<Employee[]> {
    const result = await this.pool.query(
      'SELECT * FROM employees WHERE department = $1',
      [department]
    );
    return result.rows;
  }
}
