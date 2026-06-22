import { Employee, CreateEmployeeDto } from "./employee.model";

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: string, dto: Partial<CreateEmployeeDto>): Promise<Employee>;
}
