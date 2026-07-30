import { BaseEntity } from '../../shared/types';

export interface Employee extends BaseEntity {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN';
  isActive: boolean;
}
