import { Employee } from "../../shared/types";

export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findByDepartment(department: string): Promise<Employee[]>;
  findByEmail(email: string): Promise<Employee | null>;
}
