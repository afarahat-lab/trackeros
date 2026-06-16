export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  hireDate: Date;
  terminationDate: Date | null;
}

export interface UpdateEmployeeDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  managerId?: string | null;
  terminationDate?: Date | null;
  isActive?: boolean;
}
