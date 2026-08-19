import crypto from 'crypto';

import { EmploymentStatus } from '../../shared/types/index';
import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';
import { CreateEmployeeDto, IEmployeeService } from './employee.service.interface';

export class EmployeeService implements IEmployeeService {
  constructor(private readonly repo: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee | null> {
    return this.repo.findById(id);
  }

  async getByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.repo.findByEmployeeNumber(employeeNumber);
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return this.repo.findByManagerId(managerId);
  }

  async create(data: CreateEmployeeDto): Promise<Employee> {
    const now = new Date();
    const employee: Employee = {
      id: crypto.randomUUID(),
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
    return this.repo.create(employee);
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee | null> {
    const allowedFields: (keyof Employee)[] = [
      'firstName',
      'lastName',
      'email',
      'managerId',
      'department',
      'hireDate',
    ];
    const sanitized: Partial<Employee> = {};
    for (const key of allowedFields) {
      if (key in data) {
        (sanitized as Record<string, unknown>)[key] = (data as Record<string, unknown>)[key];
      }
    }
    return this.repo.update(id, sanitized);
  }

  async terminate(id: string): Promise<Employee | null> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      return null;
    }
    return this.repo.update(id, {
      employmentStatus: EmploymentStatus.TERMINATED,
      terminationDate: new Date(),
    });
  }
}
