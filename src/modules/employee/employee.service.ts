import { Employee } from './employee.model';

export interface IEmployeeService {
  getEmployeeById(id: string): Promise<Employee | null>;
  getManagerByEmployeeId(employeeId: string): Promise<Employee | null>;
}
