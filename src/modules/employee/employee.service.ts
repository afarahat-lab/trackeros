import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository';
import { EmploymentStatus } from '../../shared/types';

export interface IEmployeeService {
  getEmployee(id: string): Promise<Employee | null>;
  getEmployeeByNumber(employeeNumber: string): Promise<Employee | null>;
  getSubordinates(managerId: string): Promise<Employee[]>;
  isActive(employeeId: string): Promise<boolean>;
  listEmployees(filters?: Record<string, any>): Promise<Employee[]>;
}

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getEmployee(id: string): Promise<Employee | null> {
    return this.employeeRepository.findById(id);
  }

  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | null> {
    return this.employeeRepository.findByEmployeeNumber(employeeNumber);
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return this.employeeRepository.findSubordinates(managerId);
  }

  async isActive(employeeId: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(employeeId);
    return employee ? employee.employmentStatus === EmploymentStatus.ACTIVE : false;
  }

  async listEmployees(filters?: Record<string, any>): Promise<Employee[]> {
    return this.employeeRepository.findAll(filters);
  }
}
