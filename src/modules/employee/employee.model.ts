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
  employmentDate: Date;
}

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  managerId?: string | null;
  department?: string | null;
  employmentDate?: Date;
}
