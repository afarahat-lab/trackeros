import type { BaseEntity } from '../../shared/types/base-entity.interface';

export interface Employee extends BaseEntity {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  department: string;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: string;
}
