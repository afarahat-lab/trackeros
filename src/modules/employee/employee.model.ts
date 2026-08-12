export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'employee' | 'manager' | 'hr_admin';
  managerId: string | null;
  department: string | null;
  hireDate: Date;
  terminationDate: Date | null;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
