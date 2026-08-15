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
