export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId?: string;
  department?: string;
  hireDate: Date;
  status: 'active' | 'on_leave' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
}
