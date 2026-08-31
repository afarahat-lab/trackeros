import { PoolClient } from 'pg';
import { Employee } from './employee.model';

export type CreateEmployeeInput = Omit<
  Employee,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

export interface IEmployeeService {
  create(input: CreateEmployeeInput): Promise<Employee>;
  list(client?: PoolClient): Promise<Employee[]>;
  findById(id: string, client?: PoolClient): Promise<Employee | null>;
  update(id: string, changes: Partial<Employee>): Promise<Employee | null>;
  terminate(id: string, terminationDate: Date): Promise<Employee | null>;
  reactivate(id: string): Promise<Employee | null>;
}
