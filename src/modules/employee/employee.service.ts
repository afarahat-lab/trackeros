import { randomUUID } from 'crypto';
import { IEmployeeService, CreateEmployeeDto } from './employee.service.interface';
import { IEmployeeRepository } from './employee.repository.interface';
import { Employee } from './employee.model';
import { EmploymentStatus } from '../../shared/types/index';

export class DuplicateEmployeeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEmployeeError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class EmployeeService implements IEmployeeService {
  constructor(private readonly repository: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee | null> {
    return this.repository.findById(id);
  }

  async getByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.repository.findByEmployeeNumber(employeeNumber);
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return this.repository.findByManagerId(managerId);
  }

  async create(data: CreateEmployeeDto): Promise<Employee> {
    this.validateCreateDto(data);

    const existingByNumber = await this.repository.findByEmployeeNumber(data.employeeNumber);
    if (existingByNumber) {
      throw new DuplicateEmployeeError(
        `Employee with employeeNumber '${data.employeeNumber}' already exists`
      );
    }

    const existingByEmail = await this.repository.findByEmail(data.email);
    if (existingByEmail) {
      throw new DuplicateEmployeeError(
        `Employee with email '${data.email}' already exists`
      );
    }

    const now = new Date();

    const employee: Employee = {
      id: randomUUID(),
      employeeNumber: data.employeeNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      managerId: data.managerId ?? null,
      department: data.department,
      hireDate: data.hireDate,
      terminationDate: null,
      employmentStatus: EmploymentStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    return this.repository.create(employee);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    return this.repository.update(id, data);
  }

  async terminate(id: string): Promise<Employee | null> {
    const employee = await this.repository.findById(id);
    if (!employee) {
      return null;
    }

    const now = new Date();
    return this.repository.update(id, {
      employmentStatus: EmploymentStatus.TERMINATED,
      terminationDate: now,
      updatedAt: now,
    });
  }

  private validateCreateDto(data: CreateEmployeeDto): void {
    const requiredFields: (keyof CreateEmployeeDto)[] = [
      'employeeNumber',
      'firstName',
      'lastName',
      'email',
      'department',
      'hireDate',
    ];

    for (const field of requiredFields) {
      const value = data[field];
      if (value === undefined || value === null) {
        throw new ValidationError(`Field '${field}' is required`);
      }
      if (typeof value === 'string' && value.trim() === '') {
        throw new ValidationError(`Field '${field}' must not be empty`);
      }
    }

    if (data.hireDate > new Date()) {
      throw new ValidationError('hireDate must not be in the future');
    }
  }
}
