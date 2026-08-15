import knex, { Knex } from 'knex';
import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

interface EmployeeRow {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  manager_id: string | null;
  department: string | null;
  hire_date: Date;
  termination_date: Date | null;
  employment_status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    managerId: row.manager_id,
    department: row.department,
    hireDate: row.hire_date,
    terminationDate: row.termination_date,
    employmentStatus: row.employment_status as Employee['employmentStatus'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
  softDelete(id: string): Promise<void>;
}

export class EmployeeRepository implements IEmployeeRepository {
  private readonly db: Knex;

  constructor() {
    this.db = knex({ client: 'pg', pool: pool as unknown as Knex.Config['pool'] });
  }

  async findById(id: string): Promise<Employee | null> {
    const row = await this.db('employees')
      .select('*')
      .where('id', id)
      .whereNull('deleted_at')
      .first<EmployeeRow>();
    return row ? toEmployee(row) : null;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const row = await this.db('employees')
      .select('*')
      .where('employee_number', employeeNumber)
      .whereNull('deleted_at')
      .first<EmployeeRow>();
    return row ? toEmployee(row) : null;
  }

  async findAll(): Promise<Employee[]> {
    const rows = await this.db('employees')
      .select('*')
      .whereNull('deleted_at');
    return rows.map(toEmployee);
  }

  async create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Employee> {
    const now = new Date();
    const [row] = await this.db('employees')
      .insert({
        employee_number: employee.employeeNumber,
        first_name: employee.firstName,
        last_name: employee.lastName,
        email: employee.email,
        manager_id: employee.managerId,
        department: employee.department,
        hire_date: employee.hireDate,
        termination_date: employee.terminationDate,
        employment_status: employee.employmentStatus,
        created_at: now,
        updated_at: now,
      })
      .returning('*');
    return toEmployee(row);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const fields: Record<string, unknown> = {};

    const columnMap: Record<string, string> = {
      employeeNumber: 'employee_number',
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      managerId: 'manager_id',
      department: 'department',
      hireDate: 'hire_date',
      terminationDate: 'termination_date',
      employmentStatus: 'employment_status',
    };

    for (const [key, col] of Object.entries(columnMap)) {
      if (key in data) {
        const val = (data as Record<string, unknown>)[key];
        if (val !== undefined) {
          fields[col] = val;
        }
      }
    }

    if (Object.keys(fields).length === 0) {
      return existing;
    }

    fields['updated_at'] = now;

    const [row] = await this.db('employees')
      .where('id', id)
      .whereNull('deleted_at')
      .update(fields)
      .returning('*');
    return row ? toEmployee(row) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.db('employees')
      .where('id', id)
      .whereNull('deleted_at')
      .update({ deleted_at: new Date(), updated_at: new Date() });
  }
}
