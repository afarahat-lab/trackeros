import { Employee, CreateEmployeeInput, UpdateEmployeeInput } from './employee.model';

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findAll(): Promise<Employee[]>;
  create(input: CreateEmployeeInput): Promise<Employee>;
  update(id: string, input: UpdateEmployeeInput): Promise<Employee>;
  delete(id: string): Promise<void>;
}
