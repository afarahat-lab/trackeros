import { Employee, CreateEmployeeInput } from './employee.model';
import { EmployeeProfile } from '../../shared/types';

export interface IEmployeeService {
  createEmployee(input: CreateEmployeeInput): Promise<Employee>;
  getEmployeeById(id: string): Promise<Employee>;
  getEmployeeByEmail(email: string): Promise<Employee>;
  getEmployeesByManagerId(managerId: string): Promise<Employee[]>;
  getEmployeeProfileById(id: string): Promise<EmployeeProfile>;
}
