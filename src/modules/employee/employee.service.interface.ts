import { Employee } from './employee.model';

export interface IEmployeeService {
  getById(id: string): Promise<Employee | null>;
  getByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  getSubordinates(managerId: string): Promise<Employee[]>;
  isActive(id: string): Promise<boolean>;
}
