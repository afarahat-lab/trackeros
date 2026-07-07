
import { pool } from '../../shared/db/connection';
import { IBaseRepository } from '../../shared/base.repository';
import { Employee } from './employee.model';

export interface IEmployeeRepository extends IBaseRepository<Employee> {
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findActive(): Promise<Employee[]>;
}

const EMPLOYEE_COLUMNS = [
  'id',
  'employee_number',
  'first_name',
  'last_name',
  'email',
  'manager_id',
  'department',
  'hire_date',
  'termination_date',
  'employment_status',
  'created_at',
  'updated_at',
  'deleted_at',
] as const;

function mapRow(row: Record<string, unknown>): Employee {
  return {
    id: row.id as string,
    employeeNumber: row.employee_number as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    managerId: (row.manager_id as string) ?? null,
    department: (row.department as string) ?? null,
    hireDate: new Date(row.hire_date as string),
    terminationDate: row.termination_date ? new Date(row.termination_date as string) : null,
    employmentStatus: row.employment_status as Employee['employmentStatus'],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
  };
}

export class EmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const result = await pool.query(
      `SELECT ${EMPLOYEE_COLUMNS.join(', ')} FROM employees WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findAll(filter?: Partial<Employee>): Promise<Employee[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter) {
      if (filter.employmentStatus !== undefined) {
        conditions.push(`employment_status = $${paramIndex++}`);
        params.push(filter.employmentStatus);
      }
      if (filter.department !== undefined) {
        conditions.push(`department = $${paramIndex++}`);
        params.push(filter.department);
      }
      if (filter.managerId !== undefined) {
        conditions.push(`manager_id = $${paramIndex++}`);
        params.push(filter.managerId);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT ${EMPLOYEE_COLUMNS.join(', ')} FROM employees ${whereClause} ORDER BY last_name, first_name`,
      params,
    );
    return result.rows.map(mapRow);
  }

  async create(entity: Partial<Employee>): Promise<Employee> {
    const columns: string[] = [];
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    const fields: Array<{ col: string; val: unknown }> = [
      { col: 'employee_number', val: entity.employeeNumber },
      { col: 'first_name', val: entity.firstName },
      { col: 'last_name', val: entity.lastName },
      { col: 'email', val: entity.email },
      { col: 'manager_id', val: entity.managerId ?? null },
      { col: 'department', val: entity.department ?? null },
      { col: 'hire_date', val: entity.hireDate },
      { col: 'termination_date', val: entity.terminationDate ?? null },
      { col: 'employment_status', val: entity.employmentStatus },
    ];

    for (const field of fields) {
      if (field.val !== undefined) {
        columns.push(field.col);
        values.push(field.val);
        placeholders.push(`$${paramIndex++}`);
      }
    }

    const result = await pool.query(
      `INSERT INTO employees (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING ${EMPLOYEE_COLUMNS.join(', ')}`,
      values,
    );
    return mapRow(result.rows[0]);
  }

  async update(id: string, entity: Partial<Employee>): Promise<Employee> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields: Array<{ col: string; val: unknown }> = [
      { col: 'employee_number', val: entity.employeeNumber },
      { col: 'first_name', val: entity.firstName },
      { col: 'last_name', val: entity.lastName },
      { col: 'email', val: entity.email },
      { col: 'manager_id', val: entity.managerId },
      { col: 'department', val: entity.department },
      { col: 'hire_date', val: entity.hireDate },
      { col: 'termination_date', val: entity.terminationDate },
      { col: 'employment_status', val: entity.employmentStatus },
    ];

    for (const field of fields) {
      if (field.val !== undefined) {
        setClauses.push(`${field.col} = $${paramIndex++}`);
        values.push(field.val);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE employees SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING ${EMPLOYEE_COLUMNS.join(', ')}`,
      values,
    );
    return mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await pool.query(
      'UPDATE employees SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const result = await pool.query(
      `SELECT ${EMPLOYEE_COLUMNS.join(', ')} FROM employees WHERE employee_number = $1 AND deleted_at IS NULL`,
      [employeeNumber],
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const result = await pool.query(
      `SELECT ${EMPLOYEE_COLUMNS.join(', ')} FROM employees WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const result = await pool.query(
      `SELECT ${EMPLOYEE_COLUMNS.join(', ')} FROM employees WHERE manager_id = $1 AND deleted_at IS NULL ORDER BY last_name, first_name`,
      [managerId],
    );
    return result.rows.map(mapRow);
  }

  async findActive(): Promise<Employee[]> {
    const result = await pool.query(
      `SELECT ${EMPLOYEE_COLUMNS.join(', ')} FROM employees WHERE employment_status = 'ACTIVE' AND deleted_at IS NULL ORDER BY last_name, first_name`,
    );
    return result.rows.map(mapRow);
  }
}
