import { Employee } from './employee.model';

export interface IEmployeeService {
  getEmployeeById(id: string): Promise<Employee | null>;
  getEmployeeByEmail(email: string): Promise<Employee | null>;
}
