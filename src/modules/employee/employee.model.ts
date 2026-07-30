import { EmploymentStatus } from '../../shared/types/index';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employmentStatus: EmploymentStatus;
  managerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
