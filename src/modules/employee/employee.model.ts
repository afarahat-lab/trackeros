import { BaseEntity } from 'shared/types/leave.types';

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface Employee extends BaseEntity {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  department: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: EmploymentStatus;
  deletedAt: Date | null;
}

export class DuplicateEmployeeNumberError extends Error {
  constructor(employeeNumber: string) {
    super(`Employee with employee number "${employeeNumber}" already exists`);
    this.name = 'DuplicateEmployeeNumberError';
  }
}

export class EmployeeNotFoundError extends Error {
  constructor(id: string) {
    super(`Employee with id "${id}" not found`);
    this.name = 'EmployeeNotFoundError';
  }
}

export class EmployeeAlreadyTerminatedError extends Error {
  constructor(id: string) {
    super(`Employee with id "${id}" is already terminated`);
    this.name = 'EmployeeAlreadyTerminatedError';
  }
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  create(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
  softDelete(id: string): Promise<void>;
}
