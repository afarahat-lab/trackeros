import { IEmployeeRepository } from './employee.repository';
import { IEmployeeService } from './employee.service.interface';
import { Employee } from './employee.model';

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      return await this.employeeRepository.findById(id);
    } catch (error) {
      throw new Error(`Failed to fetch employee by id: ${id}`);
    }
  }

  async getManagerForEmployee(employeeId: string): Promise<Employee | null> {
    try {
      const employee = await this.employeeRepository.findById(employeeId);
      if (!employee || !employee.managerId) {
        return null;
      }
      return await this.employeeRepository.findById(employee.managerId);
    } catch (error) {
      throw new Error(`Failed to fetch manager for employee: ${employeeId}`);
    }
  }

  async getDirectReports(managerId: string): Promise<Employee[]> {
    try {
      return await this.employeeRepository.findByManagerId(managerId);
    } catch (error) {
      throw new Error(`Failed to fetch direct reports for manager: ${managerId}`);
    }
  }
}
