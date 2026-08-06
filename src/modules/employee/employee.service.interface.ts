
import { Employee } from './employee.model';

export interface IEmployeeService {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  getDirectReports(managerId: string): Promise<Employee[]>;
  isManagerOf(managerId: string, employeeId: string): Promise<boolean>;
  createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>;
  updateEmployee(id: string, data: Partial<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Employee | null>;
  terminateEmployee(id: string): Promise<Employee>;
}
