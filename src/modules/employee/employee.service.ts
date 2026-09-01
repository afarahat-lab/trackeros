import type { PoolClient } from 'pg';

import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from './employee.model';
import { EmployeeRepository } from './employee.repository';
import type { IEmployeeRepository } from './employee.repository';
import type { IEmployeeService } from './employee.service.interface';

export class EmployeeService implements IEmployeeService {
  private readonly repository: IEmployeeRepository;

  constructor(repository?: IEmployeeRepository) {
    this.repository = repository ?? new EmployeeRepository();
  }

  create(input: CreateEmployeeInput, client?: PoolClient): Promise<Employee> {
    return this.repository.create(input, client);
  }

  findById(id: string): Promise<Employee | null> {
    return this.repository.findById(id);
  }

  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.repository.findByEmployeeNumber(employeeNumber);
  }

  findByEmail(email: string): Promise<Employee | null> {
    return this.repository.findByEmail(email);
  }

  findByManager(managerId: string): Promise<Employee[]> {
    return this.repository.findByManager(managerId);
  }

  update(id: string, changes: UpdateEmployeeInput, client?: PoolClient): Promise<Employee> {
    return this.repository.update(id, changes, client);
  }

  softDelete(id: string, client?: PoolClient): Promise<Employee> {
    return this.repository.softDelete(id, client);
  }
}
