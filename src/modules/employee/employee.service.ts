import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository';
import { NotFoundError } from 'shared/error-types';

export interface IEmployeeService {
  getById(id: string): Promise<Employee>;
  getByEmployeeNumber(employeeNumber: string): Promise<Employee>;
  getByEmail(email: string): Promise<Employee>;
  getSubordinates(managerId: string): Promise<Employee[]>;
  isActive(id: string): Promise<boolean>;
}

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError(`Employee with id ${id} not found`);
    }
    return employee;
  }

  async getByEmployeeNumber(employeeNumber: string): Promise<Employee> {
    const employee = await this.employeeRepository.findByEmployeeNumber(employeeNumber);
    if (!employee) {
      throw new NotFoundError(`Employee with employee number ${employeeNumber} not found`);
    }
    return employee;
  }

  async getByEmail(email: string): Promise<Employee> {
    const employee = await this.employeeRepository.findByEmail(email);
    if (!employee) {
      throw new NotFoundError(`Employee with email ${email} not found`);
    }
    return employee;
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return this.employeeRepository.findByManagerId(managerId);
  }

  async isActive(id: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError(`Employee with id ${id} not found`);
    }
    return employee.employmentStatus === 'ACTIVE';
  }
}
