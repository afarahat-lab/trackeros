import { Employee } from './employee.model';
import { IEmployeeRepository } from './employee.repository.interface';
import { IEmployeeService } from './employee.service.interface';

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getEmployeeById(id: string): Promise<Employee | null> {
    return this.employeeRepository.findById(id);
  }

  async getEmployeeByEmail(email: string): Promise<Employee | null> {
    return this.employeeRepository.findByEmail(email);
  }
}
