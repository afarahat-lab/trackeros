export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  role: string;
  department: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
  managerId?: string | null;
  role?: string;
  department?: string | null;
}
