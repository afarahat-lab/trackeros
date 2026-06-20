import { EmployeeService } from "../../../../src/modules/employee/employee.service";
import { IEmployeeRepository } from "../../../../src/modules/employee/employee.repository.interface";
import { Employee, AppError } from "../../../../src/shared/types";

describe("EmployeeService", () => {
  let service: EmployeeService;
  let mockRepo: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByManagerId: jest.fn(),
      findByDepartment: jest.fn(),
      findByEmail: jest.fn(),
    };
    service = new EmployeeService(mockRepo);
  });

  describe("getEmployee", () => {
    it("should return employee when found", async () => {
      const mockEmployee = { id: '1', name: 'John', email: 'john@test.com', department: 'IT', role: 'employee' } as Employee;
      mockRepo.findById.mockResolvedValue(mockEmployee);
      
      const result = await service.getEmployee('1');
      expect(result).toEqual(mockEmployee);
    });

    it("should throw AppError when repo fails", async () => {
      mockRepo.findById.mockRejectedValue(new Error("DB error"));
      
      await expect(service.getEmployee('1')).rejects.toThrow(AppError);
    });
  });

  describe("getEmployeesByManager", () => {
    it("should return direct reports", async () => {
      const mockEmployees = [{ id: '2', name: 'Jane', email: 'jane@test.com', department: 'IT', role: 'employee', managerId: '1' }] as Employee[];
      mockRepo.findByManagerId.mockResolvedValue(mockEmployees);
      
      const result = await service.getEmployeesByManager('1');
      expect(result).toEqual(mockEmployees);
    });
  });

  describe("getEmployeesByDepartment", () => {
    it("should return employees by department", async () => {
      const mockEmployees = [{ id: '1', name: 'John', email: 'john@test.com', department: 'IT', role: 'employee' }] as Employee[];
      mockRepo.findByDepartment.mockResolvedValue(mockEmployees);
      
      const result = await service.getEmployeesByDepartment('IT');
      expect(result).toEqual(mockEmployees);
    });
  });

  describe("getEmployeeByEmail", () => {
    it("should return employee by email", async () => {
      const mockEmployee = { id: '1', name: 'John', email: 'john@test.com', department: 'IT', role: 'employee' } as Employee;
      mockRepo.findByEmail.mockResolvedValue(mockEmployee);
      
      const result = await service.getEmployeeByEmail('john@test.com');
      expect(result).toEqual(mockEmployee);
    });
  });
});
