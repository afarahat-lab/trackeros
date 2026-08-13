import { Knex, knex } from 'knex';
import { PoolClient } from 'pg';
import { pool } from '../../shared/db/connection';
import { PaginationParams, PaginationResult } from '../../shared/types';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto } from './employee.model';

const db: Knex = knex({
  client: 'pg',
  pool: pool as unknown as Record<string, unknown>,
});

const TABLE = 'employees';

interface EmployeeRow {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  manager_id: string | null;
  department: string | null;
  hire_date: Date;
  termination_date: Date | null;
  employment_status: string;
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
    role: row.role as Employee['role'],
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

export class DuplicateEmployeeError extends Error {
  public readonly field: string;

  constructor(field: string) {
    super(`Duplicate employee: ${field} already exists`);
    this.name = 'DuplicateEmployeeError';
    this.field = field;
  }
}

export class EmployeeNotFoundError extends Error {
  constructor(id: string) {
    super(`Employee not found: ${id}`);
    this.name = 'EmployeeNotFoundError';
  }
}

export interface IEmployeeRepository {
  findById(id: string, client?: PoolClient): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string, client?: PoolClient): Promise<Employee | null>;
  findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]>;
  findAll(params: PaginationParams, client?: PoolClient): Promise<PaginationResult<Employee>>;
  create(dto: CreateEmployeeDto, client?: PoolClient): Promise<Employee>;
  update(id: string, dto: UpdateEmployeeDto, client?: PoolClient): Promise<Employee>;
  softDelete(id: string, client?: PoolClient): Promise<void>;
}

function withClient<T>(
  client: PoolClient | undefined,
  queryBuilder: Knex.QueryBuilder,
): Knex.QueryBuilder {
  if (client) {
    return queryBuilder.connection(client);
  }
  return queryBuilder;
}

export class EmployeeRepository implements IEmployeeRepository {
  async findById(id: string, client?: PoolClient): Promise<Employee | null> {
    const query = db(TABLE).where('id', id).whereNull('deleted_at').first();
    const row = await withClient(client, query);
    return row ? rowToEmployee(row as EmployeeRow) : null;
  }

  async findByEmployeeNumber(employeeNumber: string, client?: PoolClient): Promise<Employee | null> {
    const query = db(TABLE).where('employee_number', employeeNumber).whereNull('deleted_at').first();
    const row = await withClient(client, query);
    return row ? rowToEmployee(row as EmployeeRow) : null;
  }

  async findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]> {
    const query = db(TABLE).where('manager_id', managerId).whereNull('deleted_at').orderBy('last_name').orderBy('first_name');
    const rows = await withClient(client, query);
    return (rows as EmployeeRow[]).map(rowToEmployee);
  }

  async findAll(params: PaginationParams, client?: PoolClient): Promise<PaginationResult<Employee>> {
    const { page, limit } = params;
    const offset = (page - 1) * limit;

    const baseQuery = db(TABLE).whereNull('deleted_at');

    const countQuery = baseQuery.clone().count('id as total').first();
    const { total } = (await withClient(client, countQuery)) as unknown as { total: string };

    const dataQuery = baseQuery.clone().orderBy('last_name').orderBy('first_name').limit(limit).offset(offset);
    const rows = (await withClient(client, dataQuery)) as EmployeeRow[];

    return {
      data: rows.map(rowToEmployee),
      total: parseInt(total, 10),
      page,
      limit,
    };
  }

  async create(dto: CreateEmployeeDto, client?: PoolClient): Promise<Employee> {
    const id = crypto.randomUUID();
    const now = new Date();

    const insertQuery = db(TABLE).insert({
      id,
      employee_number: dto.employeeNumber,
      first_name: dto.firstName,
      last_name: dto.lastName,
      email: dto.email,
      role: dto.role,
      manager_id: dto.managerId,
      department: dto.department,
      hire_date: dto.hireDate,
      employment_status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    }).returning('*');

    try {
      const rows = await withClient(client, insertQuery);
      return rowToEmployee(rows[0] as EmployeeRow);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        const detail = getErrorDetail(err as { detail?: string });
        if (detail?.includes('employee_number')) {
          throw new DuplicateEmployeeError('employeeNumber');
        }
        if (detail?.includes('email')) {
          throw new DuplicateEmployeeError('email');
        }
        throw new DuplicateEmployeeError('unknown');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateEmployeeDto, client?: PoolClient): Promise<Employee> {
    const existing = await this.findById(id, client);
    if (!existing) {
      throw new EmployeeNotFoundError(id);
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };

    if (dto.firstName !== undefined) updates.first_name = dto.firstName;
    if (dto.lastName !== undefined) updates.last_name = dto.lastName;
    if (dto.email !== undefined) updates.email = dto.email;
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.managerId !== undefined) updates.manager_id = dto.managerId;
    if (dto.department !== undefined) updates.department = dto.department;
    if (dto.hireDate !== undefined) updates.hire_date = dto.hireDate;
    if (dto.terminationDate !== undefined) updates.termination_date = dto.terminationDate;
    if (dto.employmentStatus !== undefined) updates.employment_status = dto.employmentStatus;

    const updateQuery = db(TABLE).where('id', id).whereNull('deleted_at').update(updates).returning('*');

    try {
      const rows = await withClient(client, updateQuery);
      return rowToEmployee(rows[0] as EmployeeRow);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        const detail = getErrorDetail(err as { detail?: string });
        if (detail?.includes('employee_number')) {
          throw new DuplicateEmployeeError('employeeNumber');
        }
        if (detail?.includes('email')) {
          throw new DuplicateEmployeeError('email');
        }
        throw new DuplicateEmployeeError('unknown');
      }
      throw err;
    }
  }

  async softDelete(id: string, client?: PoolClient): Promise<void> {
    const updateQuery = db(TABLE).where('id', id).whereNull('deleted_at').update({
      deleted_at: new Date(),
      updated_at: new Date(),
    });
    await withClient(client, updateQuery);
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}

function getErrorDetail(err: { detail?: string }): string | undefined {
  return err.detail;
}
