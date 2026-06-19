import { EmployeeDto } from './employee.dto';

export interface EmployeeService {
  getEmployeeById(id: string): Promise<EmployeeDto | null>;
  getEmployeeByNumber(employeeNumber: string): Promise<EmployeeDto | null>;
  getEmployeesByManager(managerId: string): Promise<EmployeeDto[]>;
}
