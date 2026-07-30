import { EmploymentStatus } from 'shared/types';

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  department: string;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: EmploymentStatus;
  createdAt: Date;
  updatedAt: Date;
}
