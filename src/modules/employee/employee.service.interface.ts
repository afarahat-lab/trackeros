import { Employee } from './employee.model';

export interface CreateEmployeeDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  managerId?: string | null;
  department: string;
  hireDate: Date;
}

export interface IEmployeeService {
  getById(id: string): Promise<Employee | null>;
  getByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  getSubordinates(managerId: string): Promise<Employee[]>;
  create(data: CreateEmployeeDto): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
  terminate(id: string): Promise<Employee | null>;
}
