import { UserRole } from '../../shared/types';

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  managerId: string | null;
  department: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: EmploymentStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateEmployeeDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  managerId: string | null;
  department: string | null;
  hireDate: Date;
}

export interface UpdateEmployeeDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  managerId?: string | null;
  department?: string | null;
  hireDate?: Date;
  terminationDate?: Date | null;
  employmentStatus?: EmploymentStatus;
}
