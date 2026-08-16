import { Employee } from './employee.model';

export interface IEmployeeService {
  getById(id: string): Promise<Employee | null>;
  getByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  isActive(id: string): Promise<boolean>;
  getManagerId(id: string): Promise<string | null>;
}
