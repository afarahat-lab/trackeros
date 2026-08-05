import { IEmployeeRepository } from './employee.repository';
import { Employee } from './employee.model';

export interface IEmployeeService {
  getById(id: string): Promise<Employee | null>;
  getByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  getByManagerId(managerId: string): Promise<Employee[]>;
  getByDepartment(department: string): Promise<Employee[]>;
  getActive(): Promise<Employee[]>;
  create(employee: Employee): Promise<Employee>;
  update(id: string, partial: Partial<Employee>): Promise<Employee | null>;
  delete(id: string): Promise<void>;
}

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee | null> {
    return this.employeeRepository.findById(id);
  }

  async getByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.employeeRepository.findByEmployeeNumber(employeeNumber);
  }

  async getByManagerId(managerId: string): Promise<Employee[]> {
    return this.employeeRepository.findByManagerId(managerId);
  }

  async getByDepartment(department: string): Promise<Employee[]> {
    return this.employeeRepository.findByDepartment(department);
  }

  async getActive(): Promise<Employee[]> {
    return this.employeeRepository.findActive();
  }

  async create(employee: Employee): Promise<Employee> {
    return this.employeeRepository.save(employee);
  }

  async update(id: string, partial: Partial<Employee>): Promise<Employee | null> {
    return this.employeeRepository.update(id, partial);
  }

  async delete(id: string): Promise<void> {
    return this.employeeRepository.softDelete(id);
  }
}
