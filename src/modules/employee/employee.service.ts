import { IEmployeeService } from './employee.service.interface';
import { IEmployeeRepository } from './employee.repository';
import { Employee } from './employee.model';

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getById(id: string): Promise<Employee | null> {
    return this.employeeRepository.findById(id);
  }

  async getByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.employeeRepository.findByEmployeeNumber(employeeNumber);
  }

  async isActive(id: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      return false;
    }
    return employee.employmentStatus === 'ACTIVE' && employee.terminationDate === null;
  }

  async getManagerId(id: string): Promise<string | null> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      return null;
    }
    return employee.managerId;
  }
}
