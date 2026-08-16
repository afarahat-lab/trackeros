import { Employee } from './employee.model';

export interface IEmployeeService {
  getEmployee(id: string): Promise<Employee>;
  getManager(employeeId: string): Promise<Employee | null>;
  isActive(id: string): Promise<boolean>;
}
