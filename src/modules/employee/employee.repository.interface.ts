import { PoolClient } from 'pg';
import { Employee, CreateEmployeeInput } from './employee.model';

export interface IEmployeeRepository {
  create(input: CreateEmployeeInput, client?: PoolClient): Promise<Employee>;
  findById(id: string, client?: PoolClient): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string, client?: PoolClient): Promise<Employee | null>;
  findByEmail(email: string, client?: PoolClient): Promise<Employee | null>;
}
