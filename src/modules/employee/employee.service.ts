import {
  Employee,
  IEmployeeRepository,
  EmployeeNotFoundError,
  EmployeeAlreadyTerminatedError,
} from './employee.model';

export class EmployeeService {
  constructor(private readonly employeeRepo: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee> {
    const employee = await this.employeeRepo.findById(id);
    if (!employee) {
      throw new EmployeeNotFoundError(id);
    }
    return employee;
  }

  async getByEmployeeNumber(employeeNumber: string): Promise<Employee> {
    const employee =
      await this.employeeRepo.findByEmployeeNumber(employeeNumber);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeNumber);
    }
    return employee;
  }

  async getAll(): Promise<Employee[]> {
    return this.employeeRepo.findAll();
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return this.employeeRepo.findByManagerId(managerId);
  }

  async create(
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<Employee> {
    return this.employeeRepo.create(data);
  }

  async update(
    id: string,
    data: Partial<Employee>
  ): Promise<Employee> {
    const employee = await this.employeeRepo.update(id, data);
    if (!employee) {
      throw new EmployeeNotFoundError(id);
    }
    return employee;
  }

  async terminate(id: string): Promise<Employee> {
    const existing = await this.employeeRepo.findById(id);
    if (!existing) {
      throw new EmployeeNotFoundError(id);
    }
    if (existing.employmentStatus === 'TERMINATED') {
      throw new EmployeeAlreadyTerminatedError(id);
    }
    const terminated = await this.employeeRepo.update(id, {
      employmentStatus: 'TERMINATED',
      terminationDate: new Date(),
    });
    if (!terminated) {
      throw new EmployeeNotFoundError(id);
    }
    return terminated;
  }
}
