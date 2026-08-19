import { Employee } from './employee.model';

export interface CreateEmployeeDto {
  fullName: string;
  email: string;
  department?: string | null;
  managerId?: string | null;
}

export interface UpdateEmployeeDto {
  fullName?: string;
  email?: string;
  department?: string | null;
  managerId?: string | null;
}

export interface IEmployeeService {
  getById(id: string): Promise<Employee | null>;
  getAll(): Promise<Employee[]>;
  getSubordinates(managerId: string): Promise<Employee[]>;
  create(data: CreateEmployeeDto): Promise<Employee>;
  update(id: string, data: UpdateEmployeeDto): Promise<Employee | null>;
  deactivate(id: string): Promise<boolean>;
}
