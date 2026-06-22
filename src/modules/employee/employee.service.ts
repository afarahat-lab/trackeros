import { IEmployeeRepository } from './employee.repository.interface';
import { Employee } from './employee.model';
import { AppError } from '../../shared/types';

export interface IEmployeeService {
  getEmployeeById(id: string): Promise<Employee>;
  getEmployeeByEmail(email: string): Promise<Employee>;
  employeeExists(id: string): Promise<boolean>;
  getManagerHierarchy(employeeId: string): Promise<Employee[]>;
  isManagerOf(managerId: string, employeeId: string): Promise<boolean>;
}

export class EmployeeService implements IEmployeeService {
  constructor(private readonly employeeRepository: IEmployeeRepository) {}

  async getEmployeeById(id: string): Promise<Employee> {
    if (!id || typeof id !== 'string') throw new AppError('Invalid employee ID', 400);
    try {
      const employee = await this.employeeRepository.findById(id);
      if (!employee) throw new AppError('Employee not found', 404);
      return employee;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error fetching employee by ID');
      throw error;
    }
  }

  async getEmployeeByEmail(email: string): Promise<Employee> {
    if (!email || typeof email !== 'string') throw new AppError('Invalid email', 400);
    try {
      const employee = await this.employeeRepository.findByEmail(email);
      if (!employee) throw new AppError('Employee not found', 404);
      return employee;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error fetching employee by email');
      throw error;
    }
  }

  async employeeExists(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') throw new AppError('Invalid employee ID', 400);
    try {
      const employee = await this.employeeRepository.findById(id);
      return !!employee;
    } catch (error) {
      console.error('Error checking employee existence');
      throw error;
    }
  }

  async getManagerHierarchy(employeeId: string): Promise<Employee[]> {
    if (!employeeId || typeof employeeId !== 'string') throw new AppError('Invalid employee ID', 400);
    try {
      const hierarchy: Employee[] = [];
      let currentId: string | null = employeeId;
      const visited = new Set<string>();

      while (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        
        const employee = await this.employeeRepository.findById(currentId);
        if (!employee) break;
        
        if (employee.managerId) {
          const manager = await this.employeeRepository.findById(employee.managerId);
          if (manager) {
            hierarchy.push(manager);
            currentId = manager.managerId;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      return hierarchy;
    } catch (error) {
      console.error('Error fetching manager hierarchy');
      throw error;
    }
  }

  async isManagerOf(managerId: string, employeeId: string): Promise<boolean> {
    if (!managerId || !employeeId) throw new AppError('Invalid manager or employee ID', 400);
    try {
      const hierarchy = await this.getManagerHierarchy(employeeId);
      return hierarchy.some(manager => manager.id === managerId);
    } catch (error) {
      console.error('Error checking manager relationship');
      throw error;
    }
  }
}
