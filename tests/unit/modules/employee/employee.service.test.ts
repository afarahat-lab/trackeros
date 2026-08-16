import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'mgr-1',
    department: 'Engineering',
    hireDate: new Date('2023-01-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2023-01-15T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('EmployeeService', () => {
  let mockRepository: jest.Mocked<IEmployeeRepository>;
  let service: EmployeeService;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new EmployeeService(mockRepository);
  });

  describe('getById', () => {
    it('should return employee when found', async () => {
      const employee = makeEmployee();
      mockRepository.findById.mockResolvedValueOnce(employee);

      const result = await service.getById('emp-1');

      expect(result).toEqual(employee);
      expect(mockRepository.findById).toHaveBeenCalledWith('emp-1');
    });

    it('should return null when not found', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByEmployeeNumber', () => {
    it('should return employee when found', async () => {
      const employee = makeEmployee();
      mockRepository.findByEmployeeNumber.mockResolvedValueOnce(employee);

      const result = await service.getByEmployeeNumber('E001');

      expect(result).toEqual(employee);
      expect(mockRepository.findByEmployeeNumber).toHaveBeenCalledWith('E001');
    });

    it('should return null when not found', async () => {
      mockRepository.findByEmployeeNumber.mockResolvedValueOnce(null);

      const result = await service.getByEmployeeNumber('E999');

      expect(result).toBeNull();
    });
  });

  describe('isActive', () => {
    it('should return true when employmentStatus is ACTIVE and terminationDate is null', async () => {
      const employee = makeEmployee({ employmentStatus: 'ACTIVE', terminationDate: null });
      mockRepository.findById.mockResolvedValueOnce(employee);

      const result = await service.isActive('emp-1');

      expect(result).toBe(true);
    });

    it('should return false when employmentStatus is not ACTIVE', async () => {
      const employee = makeEmployee({ employmentStatus: 'INACTIVE', terminationDate: null });
      mockRepository.findById.mockResolvedValueOnce(employee);

      const result = await service.isActive('emp-1');

      expect(result).toBe(false);
    });

    it('should return false when terminationDate is set', async () => {
      const employee = makeEmployee({
        employmentStatus: 'ACTIVE',
        terminationDate: new Date('2024-01-01'),
      });
      mockRepository.findById.mockResolvedValueOnce(employee);

      const result = await service.isActive('emp-1');

      expect(result).toBe(false);
    });

    it('should return false when employee not found', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);

      const result = await service.isActive('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when status is TERMINATED', async () => {
      const employee = makeEmployee({ employmentStatus: 'TERMINATED', terminationDate: null });
      mockRepository.findById.mockResolvedValueOnce(employee);

      const result = await service.isActive('emp-1');

      expect(result).toBe(false);
    });
  });

  describe('getManagerId', () => {
    it('should return managerId when employee has one', async () => {
      const employee = makeEmployee({ managerId: 'mgr-1' });
      mockRepository.findById.mockResolvedValueOnce(employee);

      const result = await service.getManagerId('emp-1');

      expect(result).toBe('mgr-1');
    });

    it('should return null when employee has no manager', async () => {
      const employee = makeEmployee({ managerId: null });
      mockRepository.findById.mockResolvedValueOnce(employee);

      const result = await service.getManagerId('emp-1');

      expect(result).toBeNull();
    });

    it('should return null when employee not found', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);

      const result = await service.getManagerId('nonexistent');

      expect(result).toBeNull();
    });
  });
});
