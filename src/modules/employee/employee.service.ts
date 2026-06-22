import { IEmployeeRepository } from './employee.repository.interface';
import { Employee, CreateEmployeeInput, UpdateEmployeeInput } from './employee.model';
import { AppError } from '../../shared/types';

export class EmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    return employee;
  }

  async getEmployeeByEmail(email: string): Promise<Employee> {
    const employee = await this.employeeRepository.findByEmail(email);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    return employee;
  }

  async getAllEmployees(): Promise<Employee[]> {
    return this.employeeRepository.findAll();
  }

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    const existing = await this.employeeRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError('Employee with this email already exists', 409);
    }
    return this.employeeRepository.create(input);
  }

  async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    if (input.email) {
      const existing = await this.employeeRepository.findByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new AppError('Employee with this email already exists', 409);
      }
    }
    return this.employeeRepository.update(id, input);
  }

  async deleteEmployee(id: string): Promise<void> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    return this.employeeRepository.delete(id);
  }
}
