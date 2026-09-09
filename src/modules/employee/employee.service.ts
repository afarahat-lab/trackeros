import { EmployeeRole, EmploymentStatus } from '../../shared/types';
import { ValidationError, NotFoundError, ConflictError } from '../../shared/errors';
import { Employee, CreateEmployeeInput } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';
import { IEmployeeService } from './employee.service.interface';

export class EmployeeService implements IEmployeeService {
  constructor(private readonly repository: IEmployeeRepository) {}

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    this.validate(input);

    const existingNumber = await this.repository.findByEmployeeNumber(input.employeeNumber);
    if (existingNumber) {
      throw new ConflictError('Employee number already exists');
    }

    const existingEmail = await this.repository.findByEmail(input.email);
    if (existingEmail) {
      throw new ConflictError('Email already exists');
    }

    return this.repository.create(input);
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await this.repository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    return employee;
  }

  private validate(input: CreateEmployeeInput): void {
    const requiredStrings: Array<[keyof CreateEmployeeInput, string]> = [
      ['employeeNumber', 'employeeNumber'],
      ['firstName', 'firstName'],
      ['lastName', 'lastName'],
      ['email', 'email'],
      ['department', 'department'],
    ];

    for (const [key, label] of requiredStrings) {
      const value = input[key];
      if (typeof value !== 'string' || value.trim() === '') {
        throw new ValidationError(`Invalid ${label}`);
      }
    }

    if (!Object.values(EmployeeRole).includes(input.role)) {
      throw new ValidationError('Invalid role');
    }

    if (!Object.values(EmploymentStatus).includes(input.employmentStatus)) {
      throw new ValidationError('Invalid employmentStatus');
    }

    if (!(input.hireDate instanceof Date) || Number.isNaN(input.hireDate.getTime())) {
      throw new ValidationError('Invalid hireDate');
    }
  }
}
