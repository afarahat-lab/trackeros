import { Employee } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByDepartment(department: string): Promise<Employee[]>;
}
