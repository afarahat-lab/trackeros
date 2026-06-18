import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository';

export class EmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new Error(`Employee with id ${id} not found`);
    }
    return employee;
  }

  async getEmployeesByManager(managerId: string): Promise<Employee[]> {
    return this.employeeRepository.findByManagerId(managerId);
  }
}
