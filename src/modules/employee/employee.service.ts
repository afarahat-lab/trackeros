import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository';
import { EmploymentStatus } from 'shared/types';

export interface IEmployeeService {
  getById(id: string): Promise<Employee | null>;
  getByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  getByEmail(email: string): Promise<Employee | null>;
  getSubordinates(managerId: string): Promise<Employee[]>;
  isActive(id: string): Promise<boolean>;
}

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee | null> {
    const employee = await this.employeeRepository.findById(id);
    return employee ?? null;
  }

  async getByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    const employee = await this.employeeRepository.findByEmployeeNumber(employeeNumber);
    return employee ?? null;
  }

  async getByEmail(email: string): Promise<Employee | null> {
    const employee = await this.employeeRepository.findByEmail(email);
    return employee ?? null;
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    const employees = await this.employeeRepository.findByManagerId(managerId);
    return employees.filter(e => e.employmentStatus === EmploymentStatus.ACTIVE);
  }

  async isActive(id: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      return false;
    }
    return employee.employmentStatus === EmploymentStatus.ACTIVE;
  }
}
