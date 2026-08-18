import { Employee } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findAll(): Promise<Employee[]>;
  create(employee: Employee): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
  softDelete(id: string): Promise<boolean>;
}
