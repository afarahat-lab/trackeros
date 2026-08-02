import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository';
import { IEmployeeService } from './employee.service.interface';

export class EmployeeService implements IEmployeeService {
  constructor(private readonly repository: IEmployeeRepository) {}

  async getEmployeeById(id: string): Promise<Employee | null> {
    return this.repository.findById(id);
  }

  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | null> {
    return this.repository.findByEmployeeNumber(employeeNumber);
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return this.repository.findByManagerId(managerId);
  }

  async getAllEmployees(): Promise<Employee[]> {
    return this.repository.findAll();
  }

  async createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Employee> {
    return this.repository.create(data);
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | null> {
    return this.repository.update(id, data);
  }

  async terminateEmployee(id: string): Promise<void> {
    await this.repository.update(id, {
      employmentStatus: 'TERMINATED',
      terminationDate: new Date(),
    } as Partial<Employee>);
    await this.repository.softDelete(id);
  }
}
