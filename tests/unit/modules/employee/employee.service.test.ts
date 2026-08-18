import { EmployeeService, DuplicateEmployeeError, ValidationError } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository.interface';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { EmploymentStatus } from '../../../../src/shared/types/index';

describe('EmployeeService', () => {
  let mockRepository: jest.Mocked<IEmployeeRepository>;
  let employeeService: EmployeeService;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByEmail: jest.fn(),
      findByManagerId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    employeeService = new EmployeeService(mockRepository);
  });

  describe('create', () => {
    const validDto = {
      employeeNumber: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      managerId: null,
      department: 'Engineering',
      hireDate: new Date('2020-01-15'),
    };

    it('should construct an Employee and delegate to repository.create', async () => {
      mockRepository.findByEmployeeNumber.mockResolvedValue(null);
      mockRepository.findByEmail.mockResolvedValue(null);

      const createdEmployee: Employee = {
        id: 'test-uuid',
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        managerId: null,
        department: 'Engineering',
        hireDate: new Date('2020-01-15'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockRepository.create.mockResolvedValue(createdEmployee);

      const result = await employeeService.create(validDto);

      expect(mockRepository.findByEmployeeNumber).toHaveBeenCalledWith('EMP001');
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(mockRepository.create).toHaveBeenCalledTimes(1);

      const passedEmployee: Employee = mockRepository.create.mock.calls[0][0];
      expect(passedEmployee.employeeNumber).toBe('EMP001');
      expect(passedEmployee.firstName).toBe('John');
      expect(passedEmployee.lastName).toBe('Doe');
      expect(passedEmployee.email).toBe('john.doe@example.com');
      expect(passedEmployee.managerId).toBeNull();
      expect(passedEmployee.department).toBe('Engineering');
      expect(passedEmployee.hireDate).toEqual(new Date('2020-01-15'));
      expect(passedEmployee.employmentStatus).toBe(EmploymentStatus.ACTIVE);
      expect(passedEmployee.terminationDate).toBeNull();
      expect(passedEmployee.deletedAt).toBeNull();
      expect(passedEmployee.id).toBeDefined();
      expect(passedEmployee.id).toHaveLength(36);
      expect(passedEmployee.createdAt).toBeInstanceOf(Date);
      expect(passedEmployee.updatedAt).toBeInstanceOf(Date);

      expect(result).toBe(createdEmployee);
    });

    it('should throw DuplicateEmployeeError if employeeNumber already exists', async () => {
      mockRepository.findByEmployeeNumber.mockResolvedValue({ id: 'existing' } as Employee);
      mockRepository.findByEmail.mockResolvedValue(null);

      await expect(employeeService.create(validDto)).rejects.toThrow(DuplicateEmployeeError);
      await expect(employeeService.create(validDto)).rejects.toThrow(
        "Employee with employeeNumber 'EMP001' already exists"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw DuplicateEmployeeError if email already exists', async () => {
      mockRepository.findByEmployeeNumber.mockResolvedValue(null);
      mockRepository.findByEmail.mockResolvedValue({ id: 'existing' } as Employee);

      await expect(employeeService.create(validDto)).rejects.toThrow(DuplicateEmployeeError);
      await expect(employeeService.create(validDto)).rejects.toThrow(
        "Employee with email 'john.doe@example.com' already exists"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if required fields are missing', async () => {
      await expect(
        employeeService.create({ ...validDto, firstName: '' })
      ).rejects.toThrow(ValidationError);

      await expect(
        employeeService.create({ ...validDto, employeeNumber: '' as unknown as string })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if hireDate is in the future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await expect(
        employeeService.create({ ...validDto, hireDate: futureDate })
      ).rejects.toThrow(ValidationError);
      await expect(
        employeeService.create({ ...validDto, hireDate: futureDate })
      ).rejects.toThrow('hireDate must not be in the future');
    });

    it('should set managerId to null when not provided', async () => {
      mockRepository.findByEmployeeNumber.mockResolvedValue(null);
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({} as Employee);

      const dtoWithoutManager = { ...validDto };
      delete (dtoWithoutManager as Record<string, unknown>).managerId;

      await employeeService.create(dtoWithoutManager);

      const passedEmployee: Employee = mockRepository.create.mock.calls[0][0];
      expect(passedEmployee.managerId).toBeNull();
    });
  });

  describe('getById', () => {
    it('should delegate to repository.findById', async () => {
      const employee: Employee = {
        id: 'emp-1',
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        managerId: null,
        department: 'Engineering',
        hireDate: new Date('2020-01-15'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockRepository.findById.mockResolvedValue(employee);

      const result = await employeeService.getById('emp-1');

      expect(mockRepository.findById).toHaveBeenCalledWith('emp-1');
      expect(result).toBe(employee);
    });

    it('should return null when employee not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await employeeService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getSubordinates', () => {
    it('should delegate to repository.findByManagerId', async () => {
      const subordinates: Employee[] = [
        { id: 'emp-2' } as Employee,
        { id: 'emp-3' } as Employee,
      ];

      mockRepository.findByManagerId.mockResolvedValue(subordinates);

      const result = await employeeService.getSubordinates('mgr-1');

      expect(mockRepository.findByManagerId).toHaveBeenCalledWith('mgr-1');
      expect(result).toBe(subordinates);
    });

    it('should return empty array when no subordinates found', async () => {
      mockRepository.findByManagerId.mockResolvedValue([]);

      const result = await employeeService.getSubordinates('mgr-1');

      expect(result).toEqual([]);
    });
  });

  describe('terminate', () => {
    it('should set employmentStatus to TERMINATED and terminationDate to now', async () => {
      const employee: Employee = {
        id: 'emp-1',
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        managerId: null,
        department: 'Engineering',
        hireDate: new Date('2020-01-15'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockRepository.findById.mockResolvedValue(employee);
      mockRepository.update.mockResolvedValue({
        ...employee,
        employmentStatus: EmploymentStatus.TERMINATED,
        terminationDate: new Date(),
      });

      const beforeCall = Date.now();
      const result = await employeeService.terminate('emp-1');
      const afterCall = Date.now();

      expect(mockRepository.findById).toHaveBeenCalledWith('emp-1');
      expect(mockRepository.update).toHaveBeenCalledTimes(1);

      const updateCall = mockRepository.update.mock.calls[0];
      expect(updateCall[0]).toBe('emp-1');
      const updateData = updateCall[1] as Partial<Employee>;
      expect(updateData.employmentStatus).toBe(EmploymentStatus.TERMINATED);
      expect(updateData.terminationDate).toBeInstanceOf(Date);
      expect((updateData.terminationDate as Date).getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect((updateData.terminationDate as Date).getTime()).toBeLessThanOrEqual(afterCall);
      expect(updateData.updatedAt).toBeInstanceOf(Date);

      expect(result).toBeDefined();
    });

    it('should return null if employee does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await employeeService.terminate('nonexistent');

      expect(result).toBeNull();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should be idempotent — already TERMINATED employee is updated again', async () => {
      const terminatedEmployee: Employee = {
        id: 'emp-1',
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        managerId: null,
        department: 'Engineering',
        hireDate: new Date('2020-01-15'),
        terminationDate: new Date('2025-06-01'),
        employmentStatus: EmploymentStatus.TERMINATED,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockRepository.findById.mockResolvedValue(terminatedEmployee);
      mockRepository.update.mockResolvedValue(terminatedEmployee);

      const result = await employeeService.terminate('emp-1');

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      const updateData = mockRepository.update.mock.calls[0][1] as Partial<Employee>;
      expect(updateData.employmentStatus).toBe(EmploymentStatus.TERMINATED);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should delegate to repository.update', async () => {
      const updateData = { firstName: 'Jane' };
      const updatedEmployee: Employee = {
        id: 'emp-1',
        employeeNumber: 'EMP001',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john@example.com',
        managerId: null,
        department: 'Engineering',
        hireDate: new Date('2020-01-15'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockRepository.update.mockResolvedValue(updatedEmployee);

      const result = await employeeService.update('emp-1', updateData);

      expect(mockRepository.update).toHaveBeenCalledWith('emp-1', updateData);
      expect(result).toBe(updatedEmployee);
    });

    it('should return null when employee not found', async () => {
      mockRepository.update.mockResolvedValue(null);

      const result = await employeeService.update('nonexistent', { firstName: 'Jane' });

      expect(result).toBeNull();
    });
  });
});
