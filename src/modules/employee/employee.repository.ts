import { Employee } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeId(employeeId: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findByDepartment(department: string): Promise<Employee[]>;
  update(id: string, updates: Partial<Employee>): Promise<Employee | null>;
}
