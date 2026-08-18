import { EmployeeService, IEmployeeService } from 'modules/employee';
import { IEmployeeRepository } from 'modules/employee';
import { Employee } from 'modules/employee';
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

    it('should return null when employee not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await employeeService.getById('nonexistent');
      expect(result).toBeNull();
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

    it('should return null when employee not found', async () => {
      mockRepository.findByEmployeeNumber.mockResolvedValue(null);

      const result = await employeeService.getByEmployeeNumber('NONEXISTENT');
      expect(result).toBeNull();
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

    it('should return null when employee not found', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      const result = await employeeService.getByEmail('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  describe('getSubordinates', () => {
    it('should return only ACTIVE employees for a manager', async () => {
      const subordinates = [
        createMockEmployee({ id: 'emp-2', employeeNumber: 'EMP002', email: 'jane@example.com', employmentStatus: EmploymentStatus.ACTIVE }),
        createMockEmployee({ id: 'emp-3', employeeNumber: 'EMP003', email: 'bob@example.com', employmentStatus: EmploymentStatus.INACTIVE }),
        createMockEmployee({ id: 'emp-4', employeeNumber: 'EMP004', email: 'alice@example.com', employmentStatus: EmploymentStatus.ACTIVE }),
      ];
      mockRepository.findByManagerId.mockResolvedValue(subordinates);

      const result = await employeeService.getSubordinates('mgr-1');
      expect(result).toHaveLength(2);
      expect(result).toEqual([subordinates[0], subordinates[2]]);
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

    it('should return false when employee not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await employeeService.isActive('nonexistent');
      expect(result).toBe(false);
    });
  });
});
