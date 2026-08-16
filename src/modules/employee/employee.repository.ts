import { Employee } from './employee.model';

/**
 * Repository interface for Employee entity.
 * All database access goes through this interface (GP-001).
 * The real DB-backed implementation comes in a later phase.
 */
export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<Employee | null>;
  findByManagerId(managerId: string): Promise<Employee[]>;
  findAll(): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee>;
  update(id: string, data: Partial<Employee>): Promise<Employee | null>;
}

/**
 * Stub implementation of IEmployeeRepository.
 * All methods throw "not implemented" — the real DB-backed
 * implementation is provided in a later phase.
 */
export class EmployeeRepository implements IEmployeeRepository {
  async findById(_id: string): Promise<Employee | null> {
    throw new Error('not implemented');
  }

  async findByEmployeeNumber(_employeeNumber: string): Promise<Employee | null> {
    throw new Error('not implemented');
  }

  async findByManagerId(_managerId: string): Promise<Employee[]> {
    throw new Error('not implemented');
  }

  async findAll(): Promise<Employee[]> {
    throw new Error('not implemented');
  }

  async create(_employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    throw new Error('not implemented');
  }

  async update(_id: string, _data: Partial<Employee>): Promise<Employee | null> {
    throw new Error('not implemented');
  }
}
