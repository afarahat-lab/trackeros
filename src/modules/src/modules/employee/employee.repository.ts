import { Employee } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findActiveEmployees(): Promise<Employee[]>;
  findSubordinates(managerId: string): Promise<Employee[]>;
}
