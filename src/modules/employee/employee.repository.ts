import { PoolClient } from 'pg';
import { IBaseRepository, BaseRepository } from 'shared/base-repository';
import { Employee } from './employee.model';

export interface IEmployeeRepository extends IBaseRepository<Employee> {
  findByEmployeeNumber(employeeNumber: string, client?: PoolClient): Promise<Employee | null>;
  findByEmail(email: string, client?: PoolClient): Promise<Employee | null>;
  findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]>;
  findActive(client?: PoolClient): Promise<Employee[]>;
}

export class EmployeeRepository extends BaseRepository<Employee> implements IEmployeeRepository {
  protected readonly tableName = 'employees';

  async findByEmployeeNumber(employeeNumber: string, client?: PoolClient): Promise<Employee | null> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE employee_number = $1 AND deleted_at IS NULL`,
      [employeeNumber],
    );
    return result.rows[0] ?? null;
  }

  async findByEmail(email: string, client?: PoolClient): Promise<Employee | null> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findByManagerId(managerId: string, client?: PoolClient): Promise<Employee[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE manager_id = $1 AND deleted_at IS NULL`,
      [managerId],
    );
    return result.rows;
  }

  async findActive(client?: PoolClient): Promise<Employee[]> {
    const executor = client ?? this.pool;
    const result = await executor.query(
      `SELECT * FROM ${this.tableName} WHERE employment_status = 'ACTIVE' AND deleted_at IS NULL`,
    );
    return result.rows;
  }
}
