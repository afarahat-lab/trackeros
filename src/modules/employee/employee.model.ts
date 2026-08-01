import { EmploymentStatus } from '../../shared/types';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  managerId: string | null;
  department: string;
  employmentStatus: EmploymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByDepartment(department: string): Promise<Employee[]>;
  findAll(): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
}
