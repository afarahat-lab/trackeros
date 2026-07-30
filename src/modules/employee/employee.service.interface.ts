import { Employee } from './employee.model';

export interface IEmployeeService {
  getById(id: string): Promise<Employee | null>;
  getByEmail(email: string): Promise<Employee | null>;
  getAll(): Promise<Employee[]>;
  createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>;
  updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | null>;
}
