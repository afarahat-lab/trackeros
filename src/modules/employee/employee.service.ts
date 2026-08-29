import type { PoolClient } from 'pg';
import { randomUUID } from 'crypto';

import { NotFoundError, ValidationError } from '../../shared/types/errors';
import {
  CreateEmployeeInput,
  Employee,
  IEmployeeRepository,
  IEmployeeService,
  UpdateEmployeeInput
} from './employee.model';
import { PgEmployeeRepository } from './employee.repository';

export class EmployeeService implements IEmployeeService {
  private readonly repository: IEmployeeRepository;

  constructor(repository: IEmployeeRepository = new PgEmployeeRepository()) {
    this.repository = repository;
  }

  async create(
    input: CreateEmployeeInput,
    client?: PoolClient
  ): Promise<Employee> {
    if (!input.email || !input.employeeNumber || !input.firstName || !input.lastName) {
      throw new ValidationError(
        'employeeNumber, firstName, lastName and email are required'
      );
    }
    const existing = await this.repository.findByEmployeeNumber(
      input.employeeNumber,
      client
    );
    if (existing) {
      throw new ValidationError(
        `An employee with number ${input.employeeNumber} already exists`
      );
    }
    const employee: Employee = {
      ...input,
      id: randomUUID()
    };
    return this.repository.create(employee, client);
  }

  async update(
    id: string,
    input: UpdateEmployeeInput,
    client?: PoolClient
  ): Promise<Employee> {
    const current = await this.repository.findById(id, client);
    if (!current) {
      throw new NotFoundError(`Employee ${id} not found`);
    }
    const merged: Employee = { ...current, ...input, id: current.id };
    return this.repository.update(merged, client);
  }

  async terminate(
    id: string,
    terminationDate?: Date,
    client?: PoolClient
  ): Promise<Employee> {
    const current = await this.repository.findById(id, client);
    if (!current) {
      throw new NotFoundError(`Employee ${id} not found`);
    }
    const merged: Employee = {
      ...current,
      employmentStatus: 'TERMINATED',
      terminationDate: terminationDate ?? new Date()
    };
    return this.repository.update(merged, client);
  }

  async findById(id: string, client?: PoolClient): Promise<Employee | null> {
    return this.repository.findById(id, client);
  }

  async findByEmployeeNumber(
    employeeNumber: string,
    client?: PoolClient
  ): Promise<Employee | null> {
    return this.repository.findByEmployeeNumber(employeeNumber, client);
  }
}
