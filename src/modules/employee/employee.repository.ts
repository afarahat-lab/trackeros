import { pool } from '../../shared/db/connection';
import { Employee, CreateEmployeeDto } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: string, dto: Partial<CreateEmployeeDto>): Promise<Employee | null>;
  softDelete(id: string): Promise<boolean>;
}

export class EmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query<Employee>(
      'SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<Employee[]> {
    const result = await pool.query<Employee>(
      'SELECT * FROM employees WHERE deleted_at IS NULL ORDER BY last_name, first_name'
    );
    return result.rows;
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await pool.query<Employee>(
      'SELECT * FROM employees WHERE manager_id = $1 AND deleted_at IS NULL ORDER BY last_name, first_name',
      [managerId]
    );
    return result.rows;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const result = await pool.query<Employee>(
      `INSERT INTO employees (
        employee_number, first_name, last_name, email, manager_id,
        department, hire_date, employment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        dto.employeeNumber,
        dto.firstName,
        dto.lastName,
        dto.email,
        dto.managerId ?? null,
        dto.department,
        dto.hireDate,
        dto.employmentStatus ?? 'ACTIVE',
      ]
    );
    return result.rows[0];
  }

  async update(id: string, dto: Partial<CreateEmployeeDto>): Promise<Employee | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const addField = (column: string, value: unknown) => {
      fields.push(`${column} = $${paramIndex++}`);
      values.push(value);
    };

    if (dto.employeeNumber !== undefined) addField('employee_number', dto.employeeNumber);
    if (dto.firstName !== undefined) addField('first_name', dto.firstName);
    if (dto.lastName !== undefined) addField('last_name', dto.lastName);
    if (dto.email !== undefined) addField('email', dto.email);
    if (dto.managerId !== undefined) addField('manager_id', dto.managerId ?? null);
    if (dto.department !== undefined) addField('department', dto.department);
    if (dto.hireDate !== undefined) addField('hire_date', dto.hireDate);
    if (dto.employmentStatus !== undefined) addField('employment_status', dto.employmentStatus);

    if (fields.length === 0) {
      const existing = await this.findById(id);
      return existing;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query<Employee>(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE employees SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
