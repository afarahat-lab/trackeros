import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';
import { IEmployeeService } from './employee.service.interface';

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee | null> {
    try {
      return await this.employeeRepository.findById(id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`EmployeeService.getById failed: ${message}`);
    }
  }

  async getByEmail(email: string): Promise<Employee | null> {
    try {
      return await this.employeeRepository.findByEmail(email);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`EmployeeService.getByEmail failed: ${message}`);
    }
  }

  async getAll(): Promise<Employee[]> {
    try {
      return await this.employeeRepository.findAll();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`EmployeeService.getAll failed: ${message}`);
    }
  }

  async createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    try {
      return await this.employeeRepository.create(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`EmployeeService.createEmployee failed: ${message}`);
    }
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | null> {
    try {
      return await this.employeeRepository.update(id, data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`EmployeeService.updateEmployee failed: ${message}`);
    }
  }
}
