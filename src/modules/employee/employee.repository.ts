import knex, { Knex } from 'knex';
import { pool } from '../../shared/db/connection';
import { Employee } from './employee.model';

interface EmployeeRow {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'employee' | 'manager' | 'hr_admin';
  manager_id: string | null;
  department: string | null;
  hire_date: Date;
  termination_date: Date | null;
  employment_status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

function rowToEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    managerId: row.manager_id,
    department: row.department,
    hireDate: row.hire_date,
    terminationDate: row.termination_date,
    employmentStatus: row.employment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findAll(): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>;
}

export class EmployeeRepository implements IEmployeeRepository {
  private readonly db: Knex;

  constructor() {
    this.db = knex({
      client: 'pg',
      pool: pool as unknown as Record<string, unknown>,
      useNullAsDefault: true,
    });
  }

  async findById(id: string): Promise<Employee | null> {
    const rows: EmployeeRow[] = await this.db('employees')
      .select('*')
      .where('id', id)
      .whereNull('deleted_at');

    if (rows.length === 0) {
      return null;
    }

    return rowToEmployee(rows[0]);
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    const rows: EmployeeRow[] = await this.db('employees')
      .select('*')
      .where('manager_id', managerId)
      .whereNull('deleted_at');

    return rows.map(rowToEmployee);
  }

  async findAll(): Promise<Employee[]> {
    const rows: EmployeeRow[] = await this.db('employees')
      .select('*')
      .whereNull('deleted_at');

    return rows.map(rowToEmployee);
  }

  async create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee> {
    const now = new Date();
    const id = crypto.randomUUID();

    const row: Omit<EmployeeRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> = {
      employee_number: employee.employeeNumber,
      first_name: employee.firstName,
      last_name: employee.lastName,
      email: employee.email,
      role: employee.role,
      manager_id: employee.managerId,
      department: employee.department,
      hire_date: employee.hireDate,
      termination_date: employee.terminationDate,
      employment_status: employee.employmentStatus,
    };

    await this.db('employees').insert({
      id,
      ...row,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    const inserted: EmployeeRow = await this.db('employees')
      .select('*')
      .where('id', id)
      .first();

    return rowToEmployee(inserted);
  }
}
