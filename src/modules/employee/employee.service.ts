import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { IUnitOfWork } from '../../shared/db/unit-of-work';
import { Employee } from './employee.model';
import { PgEmployeeRepository } from './employee.repository';
import {
  CreateEmployeeInput,
  IEmployeeService,
} from './employee.service.interface';

export class InvalidEmployeeTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEmployeeTransitionError';
  }
}

export class EmployeeService implements IEmployeeService {
  constructor(
    private readonly employees: PgEmployeeRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const now = new Date();
    const employee: Employee = {
      id: randomUUID(),
      employeeNumber: input.employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      managerId: input.managerId,
      department: input.department,
      hireDate: input.hireDate,
      terminationDate: input.terminationDate,
      employmentStatus: input.employmentStatus,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    return this.employees.create(employee);
  }

  async list(client?: PoolClient): Promise<Employee[]> {
    return this.employees.list(client);
  }

  async findById(
    id: string,
    client?: PoolClient,
  ): Promise<Employee | null> {
    return this.employees.findById(id, client);
  }

  async update(
    id: string,
    changes: Partial<Employee>,
    client?: PoolClient,
  ): Promise<Employee | null> {
    const run = (db: PoolClient): Promise<Employee | null> =>
      this.employees.update(id, changes, db);
    return client ? run(client) : this.uow.withTransaction(run);
  }

  async terminate(
    id: string,
    terminationDate: Date,
    client?: PoolClient,
  ): Promise<Employee | null> {
    const run = async (db: PoolClient): Promise<Employee | null> => {
      const employee = await this.employees.findById(id, db);
      if (!employee) {
        return null;
      }
      if (employee.employmentStatus === 'TERMINATED') {
        throw new InvalidEmployeeTransitionError(
          `Employee ${id} is already terminated`,
        );
      }
      return this.employees.update(
        id,
        { employmentStatus: 'TERMINATED', terminationDate },
        db,
      );
    };
    return client ? run(client) : this.uow.withTransaction(run);
  }

  async reactivate(id: string, client?: PoolClient): Promise<Employee | null> {
    const run = async (db: PoolClient): Promise<Employee | null> => {
      const employee = await this.employees.findById(id, db);
      if (!employee) {
        return null;
      }
      if (employee.employmentStatus === 'ACTIVE') {
        throw new InvalidEmployeeTransitionError(
          `Employee ${id} is already active`,
        );
      }
      return this.employees.update(
        id,
        { employmentStatus: 'ACTIVE', terminationDate: null },
        db,
      );
    };
    return client ? run(client) : this.uow.withTransaction(run);
  }
}
