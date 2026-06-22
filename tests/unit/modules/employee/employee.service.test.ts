import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository.interface';
import { AppError } from '../../../../src/shared/types';
import { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '../../../../src/modules/employee/employee.model';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let repository: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new EmployeeService(repository);
  });

  const mockEmployee: Employee = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    managerId: null,
    department: 'Engineering',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getEmployeeById', () => {
    it('should return an employee if found', async () => {
      repository.findById.mockResolvedValue(mockEmployee);
      const result = await service.getEmployeeById('1');
      expect(result).toEqual(mockEmployee);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw AppError if not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getEmployeeById('1')).rejects.toThrow(AppError);
    });
  });

  describe('getEmployeeByEmail', () => {
    it('should return an employee if found', async () => {
      repository.findByEmail.mockResolvedValue(mockEmployee);
      const result = await service.getEmployeeByEmail('john@example.com');
      expect(result).toEqual(mockEmployee);
    });

    it('should throw AppError if not found', async () => {
      repository.findByEmail.mockResolvedValue(null);
      await expect(service.getEmployeeByEmail('john@example.com')).rejects.toThrow(AppError);
    });
  });

  describe('getAllEmployees', () => {
    it('should return an array of employees', async () => {
      repository.findAll.mockResolvedValue([mockEmployee]);
      const result = await service.getAllEmployees();
      expect(result).toEqual([mockEmployee]);
    });
  });

  describe('createEmployee', () => {
    const input: CreateEmployeeInput = {
      name: 'John Doe',
      email: 'john@example.com',
      managerId: null,
      department: 'Engineering',
      status: 'active',
    };

    it('should create and return an employee', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockEmployee);
      const result = await service.createEmployee(input);
      expect(result).toEqual(mockEmployee);
    });

    it('should throw AppError if email already exists', async () => {
      repository.findByEmail.mockResolvedValue(mockEmployee);
      await expect(service.createEmployee(input)).rejects.toThrow(AppError);
    });
  });

  describe('updateEmployee', () => {
    const input: UpdateEmployeeInput = { name: 'Jane Doe' };

    it('should update and return an employee', async () => {
      repository.update.mockResolvedValue({ ...mockEmployee, name: 'Jane Doe' });
      const result = await service.updateEmployee('1', input);
      expect(result.name).toBe('Jane Doe');
    });

    it('should throw AppError if new email already exists for another employee', async () => {
      const otherEmployee = { ...mockEmployee, id: '2' };
      repository.findByEmail.mockResolvedValue(otherEmployee);
      await expect(service.updateEmployee('1', { email: 'john@example.com' })).rejects.toThrow(AppError);
    });
  });

  describe('deleteEmployee', () => {
    it('should delete an employee if found', async () => {
      repository.findById.mockResolvedValue(mockEmployee);
      repository.delete.mockResolvedValue(undefined);
      await service.deleteEmployee('1');
      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw AppError if not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.deleteEmployee('1')).rejects.toThrow(AppError);
    });
  });
});
