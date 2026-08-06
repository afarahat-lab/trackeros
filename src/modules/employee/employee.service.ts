
import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';
import { IEmployeeService } from './employee.service.interface';
import { ValidationError, NotFoundError } from '../../shared/errors';

const VALID_EMPLOYMENT_STATUSES: ReadonlySet<string> = new Set(['ACTIVE', 'INACTIVE', 'TERMINATED']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async findById(id: string): Promise<Employee | null> {
    if (!isNonEmptyString(id)) {
      throw new ValidationError('id must be a non-empty string');
    }
    return this.employeeRepository.findById(id);
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    if (!isNonEmptyString(employeeNumber)) {
      throw new ValidationError('employeeNumber must be a non-empty string');
    }
    return this.employeeRepository.findByEmployeeNumber(employeeNumber);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    if (!isNonEmptyString(email)) {
      throw new ValidationError('email must be a non-empty string');
    }
    return this.employeeRepository.findByEmail(email);
  }

  async getDirectReports(managerId: string): Promise<Employee[]> {
    if (!isNonEmptyString(managerId)) {
      throw new ValidationError('managerId must be a non-empty string');
    }
    return this.employeeRepository.findByManagerId(managerId);
  }

  async isManagerOf(managerId: string, employeeId: string): Promise<boolean> {
    if (!isNonEmptyString(managerId)) {
      throw new ValidationError('managerId must be a non-empty string');
    }
    if (!isNonEmptyString(employeeId)) {
      throw new ValidationError('employeeId must be a non-empty string');
    }

    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundError(`Employee with id ${employeeId} not found`);
    }

    return employee.managerId === managerId;
  }

  async createEmployee(
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<Employee> {
    if (!isNonEmptyString(data.employeeNumber)) {
      throw new ValidationError('employeeNumber is required and must be a non-empty string');
    }
    if (!isNonEmptyString(data.firstName)) {
      throw new ValidationError('firstName is required and must be a non-empty string');
    }
    if (!isNonEmptyString(data.lastName)) {
      throw new ValidationError('lastName is required and must be a non-empty string');
    }
    if (!isNonEmptyString(data.email)) {
      throw new ValidationError('email is required and must be a non-empty string');
    }
    if (!VALID_EMPLOYMENT_STATUSES.has(data.employmentStatus)) {
      throw new ValidationError(
        `employmentStatus must be one of: ${Array.from(VALID_EMPLOYMENT_STATUSES).join(', ')}`
      );
    }

    try {
      return await this.employeeRepository.create(data);
    } catch (error: unknown) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error creating employee';
      throw new Error(message);
    }
  }

  async updateEmployee(
    id: string,
    data: Partial<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Employee | null> {
    if (!isNonEmptyString(id)) {
      throw new ValidationError('id must be a non-empty string');
    }

    if (data.employmentStatus !== undefined && !VALID_EMPLOYMENT_STATUSES.has(data.employmentStatus)) {
      throw new ValidationError(
        `employmentStatus must be one of: ${Array.from(VALID_EMPLOYMENT_STATUSES).join(', ')}`
      );
    }

    try {
      return await this.employeeRepository.update(id, data);
    } catch (error: unknown) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error updating employee';
      throw new Error(message);
    }
  }

  async terminateEmployee(id: string): Promise<Employee> {
    if (!isNonEmptyString(id)) {
      throw new ValidationError('id must be a non-empty string');
    }

    const updated = await this.employeeRepository.update(id, {
      employmentStatus: 'TERMINATED',
      terminationDate: new Date(),
    });

    if (!updated) {
      throw new NotFoundError(`Employee with id ${id} not found`);
    }

    return updated;
  }
}
