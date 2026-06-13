export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId?: string;
  department?: string;
  hireDate: Date;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  createdAt: Date;
  updatedAt: Date;
}
