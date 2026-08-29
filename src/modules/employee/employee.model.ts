import type { PoolClient } from 'pg';

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  department: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: EmploymentStatus;
}

export type CreateEmployeeInput = Omit<Employee, 'id'>;
export type UpdateEmployeeInput = Partial<Omit<Employee, 'id'>>;

export interface IEmployeeRepository {
  create(employee: Employee, client?: PoolClient): Promise<Employee>;
  update(employee: Employee, client?: PoolClient): Promise<Employee>;
  findById(id: string, client?: PoolClient): Promise<Employee | null>;
  findByEmployeeNumber(
    employeeNumber: string,
    client?: PoolClient
  ): Promise<Employee | null>;
  findByEmail(email: string, client?: PoolClient): Promise<Employee | null>;
  list(client?: PoolClient): Promise<Employee[]>;
}

export interface IEmployeeService {
  create(input: CreateEmployeeInput, client?: PoolClient): Promise<Employee>;
  update(
    id: string,
    input: UpdateEmployeeInput,
    client?: PoolClient
  ): Promise<Employee>;
  terminate(
    id: string,
    terminationDate?: Date,
    client?: PoolClient
  ): Promise<Employee>;
  findById(id: string, client?: PoolClient): Promise<Employee | null>;
  findByEmployeeNumber(
    employeeNumber: string,
    client?: PoolClient
  ): Promise<Employee | null>;
}
