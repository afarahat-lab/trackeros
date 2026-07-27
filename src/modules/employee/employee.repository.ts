import knex, { Knex } from 'knex';
import { pool } from '../../shared/db/connection';
import { IBaseRepository } from '../../shared/base-repository';
import { Employee } from './employee.model';

export interface IEmployeeRepository extends IBaseRepository<Employee> {
  findByUserId(userId: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findByDepartment(department: string): Promise<Employee[]>;
  findByStatus(status: string): Promise<Employee[]>;
}

const TABLE_NAME = 'employees';

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class KnexEmployeeRepository implements IEmployeeRepository {
  private readonly db: Knex;

  constructor(db?: Knex) {
    this.db = db ?? knex({ client: 'pg', pool: pool as Knex.PoolConfig });
  }

  async findById(id: string): Promise<Employee | null> {
    try {
      const row = await this.db(TABLE_NAME).where({ id }).first();
      return row ? this.toEmployee(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find employee by id: ${id}`,
        error,
      );
    }
  }

  async findAll(): Promise<Employee[]> {
    try {
      const rows = await this.db(TABLE_NAME).select('*');
      return rows.map((row) => this.toEmployee(row));
    } catch (error) {
      throw new RepositoryError('Failed to find all employees', error);
    }
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    try {
      const row = await this.db(TABLE_NAME).where({ userId }).first();
      return row ? this.toEmployee(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find employee by userId: ${userId}`,
        error,
      );
    }
  }

  async findByEmail(email: string): Promise<Employee | null> {
    try {
      const row = await this.db(TABLE_NAME).where({ email }).first();
      return row ? this.toEmployee(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to find employee by email: ${email}`,
        error,
      );
    }
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    try {
      const rows = await this.db(TABLE_NAME).where({ managerId }).select('*');
      return rows.map((row) => this.toEmployee(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find employees by managerId: ${managerId}`,
        error,
      );
    }
  }

  async findByDepartment(department: string): Promise<Employee[]> {
    try {
      const rows = await this.db(TABLE_NAME).where({ department }).select('*');
      return rows.map((row) => this.toEmployee(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find employees by department: ${department}`,
        error,
      );
    }
  }

  async findByStatus(status: string): Promise<Employee[]> {
    try {
      const rows = await this.db(TABLE_NAME).where({ status }).select('*');
      return rows.map((row) => this.toEmployee(row));
    } catch (error) {
      throw new RepositoryError(
        `Failed to find employees by status: ${status}`,
        error,
      );
    }
  }

  async create(entity: Omit<Employee, 'id'>): Promise<Employee> {
    try {
      const [row] = await this.db(TABLE_NAME).insert(entity).returning('*');
      return this.toEmployee(row);
    } catch (error) {
      throw new RepositoryError('Failed to create employee', error);
    }
  }

  async update(id: string, entity: Partial<Employee>): Promise<Employee | null> {
    try {
      const [row] = await this.db(TABLE_NAME)
        .where({ id })
        .update({ ...entity, updatedAt: new Date() })
        .returning('*');
      return row ? this.toEmployee(row) : null;
    } catch (error) {
      throw new RepositoryError(
        `Failed to update employee: ${id}`,
        error,
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const count = await this.db(TABLE_NAME).where({ id }).delete();
      return count > 0;
    } catch (error) {
      throw new RepositoryError(
        `Failed to delete employee: ${id}`,
        error,
      );
    }
  }

  private toEmployee(row: Record<string, unknown>): Employee {
    return {
      id: row.id as string,
      userId: row.userId as string,
      firstName: row.firstName as string,
      lastName: row.lastName as string,
      email: row.email as string,
      role: row.role as string,
      managerId: (row.managerId as string) ?? null,
      department: row.department as string,
      designation: row.designation as string,
      dateOfJoining: new Date(row.dateOfJoining as string),
      status: row.status as Employee['status'],
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    };
  }
}
