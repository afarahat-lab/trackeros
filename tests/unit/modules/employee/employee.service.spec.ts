import { EmployeeService, IEmployeeService } from 'modules/employee';
import { IEmployeeRepository } from 'modules/employee';
import { Employee } from 'modules/employee';
import { NotFoundError } from 'shared/error-types';
import { EmploymentStatus } from 'shared/types';

function createMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'mgr-1',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2020-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('EmployeeService', () => {
  let employeeService: IEmployeeService;
  let mockRepository: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByEmail: jest.fn(),
      findByManagerId: jest.fn(),
      findActive: jest.fn(),
    };

    employeeService = new EmployeeService(mockRepository);
  });

  describe('getById', () => {
    it('should return an employee when found', async () => {
      const employee = createMockEmployee();
      mockRepository.findById.mockResolvedValue(employee);

      const result = await employeeService.getById('emp-1');
      expect(result).toEqual(employee);
      expect(mockRepository.findById).toHaveBeenCalledWith('emp-1');
    });

    it('should throw NotFoundError when employee not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(employeeService.getById('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(employeeService.getById('nonexistent')).rejects.toThrow(
        'Employee with id nonexistent not found',
      );
    });
  });

  describe('getByEmployeeNumber', () => {
    it('should return an employee when found', async () => {
      const employee = createMockEmployee();
      mockRepository.findByEmployeeNumber.mockResolvedValue(employee);

      const result = await employeeService.getByEmployeeNumber('EMP001');
      expect(result).toEqual(employee);
      expect(mockRepository.findByEmployeeNumber).toHaveBeenCalledWith('EMP001');
    });

    it('should throw NotFoundError when employee not found', async () => {
      mockRepository.findByEmployeeNumber.mockResolvedValue(null);

      await expect(employeeService.getByEmployeeNumber('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByEmail', () => {
    it('should return an employee when found', async () => {
      const employee = createMockEmployee();
      mockRepository.findByEmail.mockResolvedValue(employee);

      const result = await employeeService.getByEmail('john.doe@example.com');
      expect(result).toEqual(employee);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('john.doe@example.com');
    });

    it('should throw NotFoundError when employee not found', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      await expect(employeeService.getByEmail('unknown@example.com')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSubordinates', () => {
    it('should return list of employees for a manager', async () => {
      const subordinates = [
        createMockEmployee({ id: 'emp-2', employeeNumber: 'EMP002', email: 'jane@example.com' }),
        createMockEmployee({ id: 'emp-3', employeeNumber: 'EMP003', email: 'bob@example.com' }),
      ];
      mockRepository.findByManagerId.mockResolvedValue(subordinates);

      const result = await employeeService.getSubordinates('mgr-1');
      expect(result).toEqual(subordinates);
      expect(mockRepository.findByManagerId).toHaveBeenCalledWith('mgr-1');
    });

    it('should return empty array when manager has no subordinates', async () => {
      mockRepository.findByManagerId.mockResolvedValue([]);

      const result = await employeeService.getSubordinates('mgr-empty');
      expect(result).toEqual([]);
    });
  });

  describe('isActive', () => {
    it('should return true for an active employee', async () => {
      const employee = createMockEmployee({ employmentStatus: EmploymentStatus.ACTIVE });
      mockRepository.findById.mockResolvedValue(employee);

      const result = await employeeService.isActive('emp-1');
      expect(result).toBe(true);
    });

    it('should return false for an inactive employee', async () => {
      const employee = createMockEmployee({ employmentStatus: EmploymentStatus.INACTIVE });
      mockRepository.findById.mockResolvedValue(employee);

      const result = await employeeService.isActive('emp-1');
      expect(result).toBe(false);
    });

    it('should return false for a terminated employee', async () => {
      const employee = createMockEmployee({ employmentStatus: EmploymentStatus.TERMINATED });
      mockRepository.findById.mockResolvedValue(employee);

      const result = await employeeService.isActive('emp-1');
      expect(result).toBe(false);
    });

    it('should throw NotFoundError when employee not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(employeeService.isActive('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
