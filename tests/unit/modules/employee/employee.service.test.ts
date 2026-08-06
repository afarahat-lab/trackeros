
import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository.interface';
import { Employee } from '../../../../src/modules/employee/employee.model';
import { ValidationError, NotFoundError } from '../../../../src/shared/errors';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  const now = new Date();
  return {
    id: 'emp-001',
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'mgr-001',
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: 'ACTIVE' as const,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function createMockRepo(): jest.Mocked<IEmployeeRepository> {
  return {
    findById: jest.fn(),
    findByEmployeeNumber: jest.fn(),
    findByEmail: jest.fn(),
    findByManagerId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

describe('EmployeeService', () => {
  let service: EmployeeService;
  let mockRepo: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new EmployeeService(mockRepo);
  });

  describe('findById', () => {
    it('should return an employee when found', async () => {
      const emp = makeEmployee();
      mockRepo.findById.mockResolvedValue(emp);

      const result = await service.findById('emp-001');

      expect(mockRepo.findById).toHaveBeenCalledWith('emp-001');
      expect(result).toEqual(emp);
    });

    it('should return null when employee is not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should reject empty id with VALIDATION_ERROR', async () => {
      await expect(service.findById('')).rejects.toThrow(ValidationError);
      await expect(service.findById('')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only id with VALIDATION_ERROR', async () => {
      await expect(service.findById('   ')).rejects.toThrow(ValidationError);
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should return an employee when found', async () => {
      const emp = makeEmployee();
      mockRepo.findByEmployeeNumber.mockResolvedValue(emp);

      const result = await service.findByEmployeeNumber('E001');

      expect(mockRepo.findByEmployeeNumber).toHaveBeenCalledWith('E001');
      expect(result).toEqual(emp);
    });

    it('should return null when not found', async () => {
      mockRepo.findByEmployeeNumber.mockResolvedValue(null);

      const result = await service.findByEmployeeNumber('E999');

      expect(result).toBeNull();
    });

    it('should reject empty employeeNumber with VALIDATION_ERROR', async () => {
      await expect(service.findByEmployeeNumber('')).rejects.toThrow(ValidationError);
      expect(mockRepo.findByEmployeeNumber).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return an employee when found', async () => {
      const emp = makeEmployee();
      mockRepo.findByEmail.mockResolvedValue(emp);

      const result = await service.findByEmail('john.doe@example.com');

      expect(mockRepo.findByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(result).toEqual(emp);
    });

    it('should return null when not found', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });

    it('should reject empty email with VALIDATION_ERROR', async () => {
      await expect(service.findByEmail('')).rejects.toThrow(ValidationError);
      expect(mockRepo.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('getDirectReports', () => {
    it('should return employees for a given manager', async () => {
      const emp1 = makeEmployee({ id: 'emp-001' });
      const emp2 = makeEmployee({ id: 'emp-002', employeeNumber: 'E002', email: 'jane@example.com' });
      mockRepo.findByManagerId.mockResolvedValue([emp1, emp2]);

      const result = await service.getDirectReports('mgr-001');

      expect(mockRepo.findByManagerId).toHaveBeenCalledWith('mgr-001');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-001');
      expect(result[1].id).toBe('emp-002');
    });

    it('should return an empty array when no direct reports', async () => {
      mockRepo.findByManagerId.mockResolvedValue([]);

      const result = await service.getDirectReports('mgr-999');

      expect(result).toEqual([]);
    });

    it('should reject empty managerId with VALIDATION_ERROR', async () => {
      await expect(service.getDirectReports('')).rejects.toThrow(ValidationError);
      expect(mockRepo.findByManagerId).not.toHaveBeenCalled();
    });
  });

  describe('isManagerOf', () => {
    it('should return true when employee.managerId matches managerId', async () => {
      const emp = makeEmployee({ id: 'emp-002', managerId: 'mgr-001' });
      mockRepo.findById.mockResolvedValue(emp);

      const result = await service.isManagerOf('mgr-001', 'emp-002');

      expect(mockRepo.findById).toHaveBeenCalledWith('emp-002');
      expect(result).toBe(true);
    });

    it('should return false when employee.managerId does not match', async () => {
      const emp = makeEmployee({ id: 'emp-002', managerId: 'mgr-002' });
      mockRepo.findById.mockResolvedValue(emp);

      const result = await service.isManagerOf('mgr-001', 'emp-002');

      expect(result).toBe(false);
    });

    it('should return false when employee has null managerId', async () => {
      const emp = makeEmployee({ id: 'emp-002', managerId: null });
      mockRepo.findById.mockResolvedValue(emp);

      const result = await service.isManagerOf('mgr-001', 'emp-002');

      expect(result).toBe(false);
    });

    it('should reject empty managerId with VALIDATION_ERROR', async () => {
      await expect(service.isManagerOf('', 'emp-002')).rejects.toThrow(ValidationError);
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it('should reject empty employeeId with VALIDATION_ERROR', async () => {
      await expect(service.isManagerOf('mgr-001', '')).rejects.toThrow(ValidationError);
      expect(mockRepo.findById).not.toHaveBeenCalled();
    });

    it('should reject with NOT_FOUND when employee does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.isManagerOf('mgr-001', 'nonexistent')).rejects.toThrow(NotFoundError);
      await expect(service.isManagerOf('mgr-001', 'nonexistent')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('createEmployee', () => {
    const validInput: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      employeeNumber: 'E003',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      managerId: 'mgr-001',
      department: 'Marketing',
      hireDate: new Date('2021-06-01'),
      terminationDate: null,
      employmentStatus: 'ACTIVE',
    };

    it('should create and return an employee', async () => {
      const created = makeEmployee({
        id: 'generated-id',
        employeeNumber: 'E003',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        department: 'Marketing',
        hireDate: new Date('2021-06-01'),
      });
      mockRepo.create.mockResolvedValue(created);

      const result = await service.createEmployee(validInput);

      expect(mockRepo.create).toHaveBeenCalledWith(validInput);
      expect(result).toEqual(created);
    });

    it('should reject empty employeeNumber with VALIDATION_ERROR', async () => {
      await expect(
        service.createEmployee({ ...validInput, employeeNumber: '' })
      ).rejects.toThrow(ValidationError);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should reject empty firstName with VALIDATION_ERROR', async () => {
      await expect(
        service.createEmployee({ ...validInput, firstName: '' })
      ).rejects.toThrow(ValidationError);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should reject empty lastName with VALIDATION_ERROR', async () => {
      await expect(
        service.createEmployee({ ...validInput, lastName: '' })
      ).rejects.toThrow(ValidationError);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should reject empty email with VALIDATION_ERROR', async () => {
      await expect(
        service.createEmployee({ ...validInput, email: '' })
      ).rejects.toThrow(ValidationError);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should reject invalid employmentStatus with VALIDATION_ERROR', async () => {
      await expect(
        service.createEmployee({ ...validInput, employmentStatus: 'FIRED' as 'ACTIVE' })
      ).rejects.toThrow(ValidationError);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should accept INACTIVE as a valid employmentStatus', async () => {
      const created = makeEmployee({ employmentStatus: 'INACTIVE' });
      mockRepo.create.mockResolvedValue(created);

      const result = await service.createEmployee({ ...validInput, employmentStatus: 'INACTIVE' });

      expect(result.employmentStatus).toBe('INACTIVE');
    });

    it('should propagate repository errors', async () => {
      mockRepo.create.mockRejectedValue(new Error('DB error'));

      await expect(service.createEmployee(validInput)).rejects.toThrow('DB error');
    });
  });

  describe('updateEmployee', () => {
    it('should update and return the employee', async () => {
      const updated = makeEmployee({ firstName: 'Johnny', department: 'Design' });
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.updateEmployee('emp-001', {
        firstName: 'Johnny',
        department: 'Design',
      });

      expect(mockRepo.update).toHaveBeenCalledWith('emp-001', {
        firstName: 'Johnny',
        department: 'Design',
      });
      expect(result).toEqual(updated);
    });

    it('should return null when employee is not found', async () => {
      mockRepo.update.mockResolvedValue(null);

      const result = await service.updateEmployee('nonexistent', { firstName: 'X' });

      expect(result).toBeNull();
    });

    it('should reject empty id with VALIDATION_ERROR', async () => {
      await expect(
        service.updateEmployee('', { firstName: 'X' })
      ).rejects.toThrow(ValidationError);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should reject invalid employmentStatus with VALIDATION_ERROR', async () => {
      await expect(
        service.updateEmployee('emp-001', { employmentStatus: 'FIRED' as 'ACTIVE' })
      ).rejects.toThrow(ValidationError);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      mockRepo.update.mockRejectedValue(new Error('DB error'));

      await expect(
        service.updateEmployee('emp-001', { firstName: 'X' })
      ).rejects.toThrow('DB error');
    });
  });

  describe('terminateEmployee', () => {
    it('should set employmentStatus to TERMINATED and set terminationDate', async () => {
      const terminated = makeEmployee({
        employmentStatus: 'TERMINATED',
        terminationDate: new Date('2024-01-01'),
      });
      mockRepo.update.mockResolvedValue(terminated);

      const result = await service.terminateEmployee('emp-001');

      expect(mockRepo.update).toHaveBeenCalledWith('emp-001', {
        employmentStatus: 'TERMINATED',
        terminationDate: expect.any(Date) as Date,
      });
      expect(result.employmentStatus).toBe('TERMINATED');
      expect(result.terminationDate).not.toBeNull();
    });

    it('should reject empty id with VALIDATION_ERROR', async () => {
      await expect(service.terminateEmployee('')).rejects.toThrow(ValidationError);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should reject with NOT_FOUND when employee does not exist', async () => {
      mockRepo.update.mockResolvedValue(null);

      await expect(service.terminateEmployee('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(service.terminateEmployee('nonexistent')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
