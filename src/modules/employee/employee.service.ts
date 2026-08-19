import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository';
import {
  IEmployeeService,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from './employee.service.interface';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): void {
  if (!email || email.trim().length === 0) {
    throw new ValidationError('Email is required and must not be empty');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

export class EmployeeService implements IEmployeeService {
  constructor(private readonly repository: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee | null> {
    return this.repository.findById(id);
  }

  async getAll(): Promise<Employee[]> {
    return this.repository.findAll();
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return this.repository.findByManager(managerId);
  }

  async create(data: CreateEmployeeDto): Promise<Employee> {
    if (!data.fullName || data.fullName.trim().length === 0) {
      throw new ValidationError('fullName is required and must not be empty');
    }
    const email = data.email.trim();
    validateEmail(email);

    return this.repository.create({
      fullName: data.fullName.trim(),
      email,
      department: data.department ?? null,
      managerId: data.managerId ?? null,
      isActive: true,
    });
  }

  async update(id: string, data: UpdateEmployeeDto): Promise<Employee | null> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return null;
    }

    if (data.email !== undefined) {
      const email = data.email.trim();
      validateEmail(email);
      data = { ...data, email };
    }

    const updateData: Partial<Employee> = { ...data, updatedAt: new Date() };
    return this.repository.update(id, updateData);
  }

  async deactivate(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return false;
    }

    if (!existing.isActive) {
      return true;
    }

    const result = await this.repository.update(id, {
      isActive: false,
      updatedAt: new Date(),
    });
    return result !== null;
  }
}
