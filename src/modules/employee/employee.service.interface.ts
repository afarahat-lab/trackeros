import { Employee, CreateEmployeeInput } from './employee.model';

export interface IEmployeeService {
  createEmployee(input: CreateEmployeeInput): Promise<Employee>;
  getEmployeeById(id: string): Promise<Employee>;
}
