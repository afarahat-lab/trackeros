import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository.interface';
import { Employee } from '../../../../src/modules/employee/employee.model';

const makeEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  employeeNumber: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  managerId: null,
  department: 'Engineering',
  hireDate: new Date('2020-01-15'),
  terminationDate: null,
  employmentStatus: 'ACTIVE',
  createdAt: new Date('2020-01-15'),
  updatedAt: new Date('2023-01-01'),
  deletedAt: null,
  ...overrides,
});

describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockRepo: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByEmail: jest.fn(),
      findByManagerId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new EmployeeService(mockRepo);
  });

  describe('getById', () => {
    it('should return employee when found', async () => {
      const emp = makeEmployee();
      mockRepo.findById.mockResolvedValue(emp);
      await expect(service.getById('emp-1')).resolves.toEqual(emp);
      expect(mockRepo.findById).toHaveBeenCalledWith('emp-1');
    });

    it('should return null when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getById('nonexistent')).resolves.toBeNull();
    });
  });

  describe('getByEmployeeNumber', () => {
    it('should return employee when found', async () => {
      const emp = makeEmployee();
      mockRepo.findByEmployeeNumber.mockResolvedValue(emp);
      await expect(service.getByEmployeeNumber('EMP001')).resolves.toEqual(emp);
    });

    it('should return null when not found', async () => {
      mockRepo.findByEmployeeNumber.mockResolvedValue(null);
      await expect(service.getByEmployeeNumber('NOPE')).resolves.toBeNull();
    });
  });

  describe('getSubordinates', () => {
    it('should return subordinates for manager', async () => {
      const subs = [makeEmployee({ id: 'emp-2' }), makeEmployee({ id: 'emp-3' })];
      mockRepo.findByManagerId.mockResolvedValue(subs);
      await expect(service.getSubordinates('mgr-1')).resolves.toEqual(subs);
      expect(mockRepo.findByManagerId).toHaveBeenCalledWith('mgr-1');
    });

    it('should return empty array when no subordinates', async () => {
      mockRepo.findByManagerId.mockResolvedValue([]);
      await expect(service.getSubordinates('mgr-1')).resolves.toEqual([]);
    });
  });

  describe('isActive', () => {
    it('should return true for active non-deleted employee', async () => {
      mockRepo.findById.mockResolvedValue(makeEmployee({ employmentStatus: 'ACTIVE', deletedAt: null }));
      await expect(service.isActive('emp-1')).resolves.toBe(true);
    });

    it('should return false for inactive employee', async () => {
      mockRepo.findById.mockResolvedValue(makeEmployee({ employmentStatus: 'INACTIVE', deletedAt: null }));
      await expect(service.isActive('emp-1')).resolves.toBe(false);
    });

    it('should return false for terminated employee', async () => {
      mockRepo.findById.mockResolvedValue(makeEmployee({ employmentStatus: 'TERMINATED', deletedAt: null }));
      await expect(service.isActive('emp-1')).resolves.toBe(false);
    });

    it('should return false for soft-deleted employee', async () => {
      mockRepo.findById.mockResolvedValue(makeEmployee({ employmentStatus: 'ACTIVE', deletedAt: new Date() }));
      await expect(service.isActive('emp-1')).resolves.toBe(false);
    });

    it('should return false when employee not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.isActive('nonexistent')).resolves.toBe(false);
    });
  });
});
