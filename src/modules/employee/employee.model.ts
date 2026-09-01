import { PoolClient } from 'pg';

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
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IEmployeeRepository {
  create(employee: Employee): Promise<Employee>;
  list(client?: PoolClient): Promise<Employee[]>;
  findById(id: string, client?: PoolClient): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  update(id: string, changes: Partial<Employee>): Promise<Employee | null>;
  delete(id: string): Promise<boolean>;
}
