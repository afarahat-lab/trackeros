import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { EmploymentStatus } from '../../../../src/shared/types/leave.types';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: 'emp-000',
    department: 'Engineering',
    hireDate: new Date('2023-01-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    createdAt: new Date('2023-01-15T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockRepo: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByManagerId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new EmployeeService(mockRepo);
  });

  describe('findById', () => {
    it('returns the employee when found', async () => {
      const employee = makeEmployee();
      mockRepo.findById.mockResolvedValueOnce(employee);

      const result = await service.findById('emp-001');

      expect(mockRepo.findById).toHaveBeenCalledWith('emp-001');
      expect(result).toEqual(employee);
    });

    it('returns null when not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      const result = await service.findById('emp-999');

      expect(result).toBeNull();
    });

    it('does not throw on a missing id', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('returns direct-report employees for the given manager', async () => {
      const reports = [makeEmployee(), makeEmployee({ id: 'emp-002', employeeNumber: 'E002' })];
      mockRepo.findByManagerId.mockResolvedValueOnce(reports);

      const result = await service.findByManagerId('emp-000');

      expect(mockRepo.findByManagerId).toHaveBeenCalledWith('emp-000');
      expect(result).toHaveLength(2);
    });

    it('returns an empty array when manager has no direct reports', async () => {
      mockRepo.findByManagerId.mockResolvedValueOnce([]);

      const result = await service.findByManagerId('emp-000');

      expect(result).toEqual([]);
    });
  });

  describe('isActive', () => {
    it('returns true when employmentStatus is ACTIVE', async () => {
      const employee = makeEmployee({ employmentStatus: EmploymentStatus.ACTIVE });
      mockRepo.findById.mockResolvedValueOnce(employee);

      const result = await service.isActive('emp-001');

      expect(result).toBe(true);
    });

    it('returns false when employmentStatus is INACTIVE', async () => {
      const employee = makeEmployee({ employmentStatus: EmploymentStatus.INACTIVE });
      mockRepo.findById.mockResolvedValueOnce(employee);

      const result = await service.isActive('emp-001');

      expect(result).toBe(false);
    });

    it('returns false when employmentStatus is TERMINATED', async () => {
      const employee = makeEmployee({ employmentStatus: EmploymentStatus.TERMINATED });
      mockRepo.findById.mockResolvedValueOnce(employee);

      const result = await service.isActive('emp-001');

      expect(result).toBe(false);
    });

    it('returns false when employee is not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      const result = await service.isActive('emp-999');

      expect(result).toBe(false);
    });

    it('does not throw on a missing id', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(service.isActive('nonexistent')).resolves.toBe(false);
    });
  });

  describe('getManagerId', () => {
    it('returns the managerId when employee is found', async () => {
      const employee = makeEmployee({ managerId: 'emp-000' });
      mockRepo.findById.mockResolvedValueOnce(employee);

      const result = await service.getManagerId('emp-001');

      expect(result).toBe('emp-000');
    });

    it('returns null when employee has no manager', async () => {
      const employee = makeEmployee({ managerId: null });
      mockRepo.findById.mockResolvedValueOnce(employee);

      const result = await service.getManagerId('emp-001');

      expect(result).toBeNull();
    });

    it('returns null when employee is not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      const result = await service.getManagerId('emp-999');

      expect(result).toBeNull();
    });

    it('does not throw on a missing id', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      await expect(service.getManagerId('nonexistent')).resolves.toBeNull();
    });
  });
});
