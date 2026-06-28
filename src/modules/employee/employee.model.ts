/**
 * Domain model and DTOs for the Employee entity.
 */

export interface Employee {
  id: string;
  name: string;
  email: string;
  managerId: string | null;
  department: string | null;
  employmentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeDto {
  name: string;
  email: string;
  managerId?: string | null;
  department?: string | null;
  employmentDate: Date | string;
}

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  managerId?: string | null;
  department?: string | null;
  employmentDate?: Date | string;
}
