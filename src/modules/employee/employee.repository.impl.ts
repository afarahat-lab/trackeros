import { IEmployeeRepository } from './employee.repository';
import { Employee } from './employee.model';

export class EmployeeRepository implements IEmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    throw new Error('Not implemented');
  }
  async findAll(): Promise<Employee[]> {
    throw new Error('Not implemented');
  }
}
