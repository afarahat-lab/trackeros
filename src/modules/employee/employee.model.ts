export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  managerId: string | null;
  hireDate: Date;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeDto {
  name: string;
  email: string;
  department: string;
  managerId?: string;
  hireDate: Date;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  department?: string;
  managerId?: string | null;
  hireDate?: Date;
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}
