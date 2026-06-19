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
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateEmployeeDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId?: string | null;
  department?: string | null;
  hireDate: Date;
  terminationDate?: Date | null;
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

export interface UpdateEmployeeDto {
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  managerId?: string | null;
  department?: string | null;
  hireDate?: Date;
  terminationDate?: Date | null;
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

export interface EmployeeQueryParams {
  employeeNumber?: string;
  email?: string;
  department?: string;
  managerId?: string;
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  page?: number;
  limit?: number;
}
