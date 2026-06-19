export interface EmployeeDto {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId: string | null;
  department: string | null;
  hireDate: Date;
  employmentStatus: 'active' | 'inactive' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
}
