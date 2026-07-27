import { EmployeeStatus } from '../../shared/types/leave.types';

export interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  managerId: string | null;
  department: string;
  designation: string;
  dateOfJoining: Date;
  status: EmployeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeDto {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  managerId: string | null;
  department: string;
  designation: string;
  dateOfJoining: Date;
  status: EmployeeStatus;
}
