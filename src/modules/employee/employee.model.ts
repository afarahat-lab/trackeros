import { EmployeeRole, EmploymentStatus } from '../../shared/types';

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: EmployeeRole;
  managerId: string | null;
  department: string;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: EmploymentStatus;
}

export type CreateEmployeeInput = Omit<Employee, 'id'>;
