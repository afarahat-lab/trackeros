import { Pool } from 'pg';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from './employee.model';

export interface IEmployeeRepository {
  create(data: CreateEmployeeDto): Promise<Employee>;
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  update(id: string, data: UpdateEmployeeDto): Promise<Employee>;
  findAllByDepartment(department: string): Promise<Employee[]>;
  findSubordinates(managerId: string): Promise<Employee[]>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: CreateEmployeeDto): Promise<Employee> {
    const query = `
      INSERT INTO employees (name, email, department, managerId, hireDate, employmentStatus)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, department, managerId, hireDate, employmentStatus, createdAt, updatedAt
    `;
    const values = [data.name, data.email, data.department, data.managerId || null, data.hireDate, data.employmentStatus];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Employee | null> {
    const query = `SELECT * FROM employees WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const query = `SELECT * FROM employees WHERE email = $1`;
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async update(id: string, data: UpdateEmployeeDto): Promise<Employee> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    if (data.name !== undefined) { fields.push(`name = $${paramCount}`); values.push(data.name); paramCount++; }
    if (data.email !== undefined) { fields.push(`email = $${paramCount}`); values.push(data.email); paramCount++; }
    if (data.department !== undefined) { fields.push(`department = $${paramCount}`); values.push(data.department); paramCount++; }
    if (data.managerId !== undefined) { fields.push(`managerId = $${paramCount}`); values.push(data.managerId); paramCount++; }
    if (data.hireDate !== undefined) { fields.push(`hireDate = $${paramCount}`); values.push(data.hireDate); paramCount++; }
    if (data.employmentStatus !== undefined) { fields.push(`employmentStatus = $${paramCount}`); values.push(data.employmentStatus); paramCount++; }
    fields.push(`updatedAt = NOW()`);
    values.push(id);
    const query = `UPDATE employees SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findAllByDepartment(department: string): Promise<Employee[]> {
    const query = `SELECT * FROM employees WHERE department = $1`;
    const result = await this.pool.query(query, [department]);
    return result.rows;
  }

  async findSubordinates(managerId: string): Promise<Employee[]> {
    const query = `SELECT * FROM employees WHERE managerId = $1`;
    const result = await this.pool.query(query, [managerId]);
    return result.rows;
  }
}
