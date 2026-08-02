import { Employee } from './employee.model';

export interface IEmployeeService {
  getEmployeeById(id: string): Promise<Employee | null>;
  getEmployeeByNumber(employeeNumber: string): Promise<Employee | null>;
  getSubordinates(managerId: string): Promise<Employee[]>;
  getAllEmployees(): Promise<Employee[]>;
  createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee>;
  updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | null>;
  terminateEmployee(id: string): Promise<void>;
}
