import { Employee, CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryParams } from './employee.model';

export interface IEmployeeRepository {
  create(data: CreateEmployeeDto): Promise<Employee>;
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  update(id: string, data: UpdateEmployeeDto): Promise<Employee | null>;
  delete(id: string): Promise<boolean>;
  findAll(query: EmployeeQueryParams): Promise<{ employees: Employee[]; total: number }>;
  findManagers(): Promise<Employee[]>;
}
