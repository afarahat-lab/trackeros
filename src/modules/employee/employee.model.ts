import { BaseEntity } from 'shared/types';

export interface Employee extends BaseEntity {
  email: string;
  fullName: string;
  role: string;
  managerId: string | null;
  department: string;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}
