import { Employee } from './employee.model';

export interface IEmployeeService {
  findById(id: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  isActive(id: string): Promise<boolean>;
  getManagerId(id: string): Promise<string | null>;
}
