import type { PoolClient } from 'pg';

import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from './employee.model';

export interface IEmployeeService {
  create(input: CreateEmployeeInput, client?: PoolClient): Promise<Employee>;
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByManager(managerId: string): Promise<Employee[]>;
  update(id: string, changes: UpdateEmployeeInput, client?: PoolClient): Promise<Employee>;
  softDelete(id: string, client?: PoolClient): Promise<Employee>;
}
