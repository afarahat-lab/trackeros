import { Employee } from '../../shared/types/index';

export interface IEmployeeService {
  getEmployee(id: string): Promise<Employee | null>;
  getEmployeesByManager(managerId: string): Promise<Employee[]>;
  getEmployeesByDepartment(department: string): Promise<Employee[]>;
  getEmployeeByEmail(email: string): Promise<Employee | null>;
}
