import { EmploymentStatus } from '../../shared/types/leave.types';

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
