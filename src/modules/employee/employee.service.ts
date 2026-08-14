import { IEmployeeService } from './employee.service.interface';
import { IEmployeeRepository } from './employee.repository';
import { Employee } from './employee.model';
import { EmploymentStatus } from '../../shared/types/leave.types';

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async findById(id: string): Promise<Employee | null> {
    return this.employeeRepository.findById(id);
  }

  async findByManagerId(managerId: string): Promise<Employee[]> {
    return this.employeeRepository.findByManagerId(managerId);
  }

  async isActive(id: string): Promise<boolean> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      return false;
    }
    return employee.employmentStatus === EmploymentStatus.ACTIVE;
  }

  async getManagerId(id: string): Promise<string | null> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      return null;
    }
    return employee.managerId;
  }
}
