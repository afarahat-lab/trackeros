import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';
import { IEmployeeService } from './employee.service.interface';

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee | null> {
    return this.employeeRepository.findById(id);
  }

  async getByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.employeeRepository.findByEmployeeNumber(employeeNumber);
  }

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return this.employeeRepository.findByManagerId(managerId);
  }

  async isActive(id: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      return false;
    }
    return employee.employmentStatus === 'ACTIVE' && employee.deletedAt === null;
  }
}
