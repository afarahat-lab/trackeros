import { Employee } from './employee.model';

export interface IEmployeeService {
  getEmployeeById(id: string): Promise<Employee | null>;
  getManagerForEmployee(employeeId: string): Promise<Employee | null>;
  getDirectReports(managerId: string): Promise<Employee[]>;
}
