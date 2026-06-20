import { IEmployeeService } from "./employee.service.interface";
import { IEmployeeRepository } from "./employee.repository.interface";
import { Employee, AppError } from "../../shared/types";

export class EmployeeService implements IEmployeeService {
  private employeeRepo: IEmployeeRepository;

  constructor(employeeRepo: IEmployeeRepository) {
    this.employeeRepo = employeeRepo;
  }

  async getEmployee(id: string): Promise<Employee | null> {
    try {
      return await this.employeeRepo.findById(id);
    } catch (error) {
      throw new AppError(`Failed to get employee: ${(error as Error).message}`, 500);
    }
  }

  async getEmployeesByManager(managerId: string): Promise<Employee[]> {
    try {
      return await this.employeeRepo.findByManagerId(managerId);
    } catch (error) {
      throw new AppError(`Failed to get employees by manager: ${(error as Error).message}`, 500);
    }
  }

  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    try {
      return await this.employeeRepo.findByDepartment(department);
    } catch (error) {
      throw new AppError(`Failed to get employees by department: ${(error as Error).message}`, 500);
    }
  }

  async getEmployeeByEmail(email: string): Promise<Employee | null> {
    try {
      return await this.employeeRepo.findByEmail(email);
    } catch (error) {
      throw new AppError(`Failed to get employee by email: ${(error as Error).message}`, 500);
    }
  }
}
