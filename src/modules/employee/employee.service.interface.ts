import { Employee, CreateEmployeeInput } from './employee.model';

export interface IEmployeeService {
  createEmployee(input: CreateEmployeeInput): Promise<Employee>;
  getEmployeeById(id: string): Promise<Employee>;
  getEmployeeByEmail(email: string): Promise<Employee>;
  getEmployeesByManagerId(managerId: string): Promise<Employee[]>;
}
