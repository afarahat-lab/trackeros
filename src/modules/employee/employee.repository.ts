import { Pool } from 'pg';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from './employee.model';

export interface IEmployeeRepository {
  create(dto: CreateEmployeeDto): Promise<Employee>;
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  update(id: string, dto: UpdateEmployeeDto): Promise<Employee>;
  delete(id: string): Promise<void>;
  findActiveEmployees(): Promise<Employee[]>;
  findSubordinates(managerId: string): Promise<Employee[]>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly pool: Pool) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const query = `
      INSERT INTO employees (
        employee_number, first_name, last_name, email,
        manager_id, hire_date, termination_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      dto.employeeNumber,
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.managerId,
      dto.hireDate,
      dto.terminationDate
    ];
    const result = await this.pool.query(query, values);
    return this.mapRowToEmployee(result.rows[0]);
  }

  async findById(id: string): Promise<Employee | null> {
    const query = 'SELECT * FROM employees WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length ? this.mapRowToEmployee(result.rows[0]) : null;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const query = 'SELECT * FROM employees WHERE employee_number = $1';
    const result = await this.pool.query(query, [employeeNumber]);
    return result.rows.length ? this.mapRowToEmployee(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const query = 'SELECT * FROM employees WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows.length ? this.mapRowToEmployee(result.rows[0]) : null;
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (dto.firstName !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(dto.firstName);
    }
    if (dto.lastName !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(dto.lastName);
    }
    if (dto.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(dto.email);
    }
    if (dto.managerId !== undefined) {
      updates.push(`manager_id = $${paramCount++}`);
      values.push(dto.managerId);
    }
    if (dto.terminationDate !== undefined) {
      updates.push(`termination_date = $${paramCount++}`);
      values.push(dto.terminationDate);
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(dto.isActive);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Employee not found');
      return existing;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const query = `
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await this.pool.query(query, values);
    return this.mapRowToEmployee(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM employees WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  async findActiveEmployees(): Promise<Employee[]> {
    const query = 'SELECT * FROM employees WHERE is_active = true ORDER BY last_name, first_name';
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToEmployee(row));
  }

  async findSubordinates(managerId: string): Promise<Employee[]> {
    const query = 'SELECT * FROM employees WHERE manager_id = $1 AND is_active = true ORDER BY last_name, first_name';
    const result = await this.pool.query(query, [managerId]);
    return result.rows.map(row => this.mapRowToEmployee(row));
  }

  private mapRowToEmployee(row: any): Employee {
    return {
      id: row.id,
      employeeNumber: row.employee_number,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      managerId: row.manager_id,
      hireDate: row.hire_date,
      terminationDate: row.termination_date,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
