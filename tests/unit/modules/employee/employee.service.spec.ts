import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import { Employee } from '../../../../src/modules/employee/employee.model';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: 'emp-mgr-1',
    department: 'Engineering',
    hireDate: new Date('2020-01-15T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2020-01-15T00:00:00.000Z'),
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
      findByEmployeeNumber: jest.fn(),
      findByManagerId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new EmployeeService(mockRepo);
  });

  describe('getEmployeeById', () => {
    it('should return an employee when found', async () => {
      const employee = makeEmployee();
      mockRepo.findById.mockResolvedValueOnce(employee);

      const result = await service.getEmployeeById('emp-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('emp-1');
      expect(result!.employeeNumber).toBe('EMP001');
      expect(mockRepo.findById).toHaveBeenCalledWith('emp-1');
    });

    it('should return null when employee not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null);

      const result = await service.getEmployeeById('nonexistent');

      expect(result).toBeNull();
    });

    it('should propagate repository errors unchanged', async () => {
      const dbError = new Error('connection refused');
      mockRepo.findById.mockRejectedValueOnce(dbError);

      await expect(service.getEmployeeById('emp-1')).rejects.toThrow('connection refused');
    });
  });

  describe('getEmployeeByNumber', () => {
    it('should return an employee when found by number', async () => {
      const employee = makeEmployee({ employeeNumber: 'EMP002' });
      mockRepo.findByEmployeeNumber.mockResolvedValueOnce(employee);

      const result = await service.getEmployeeByNumber('EMP002');

      expect(result).not.toBeNull();
      expect(result!.employeeNumber).toBe('EMP002');
      expect(mockRepo.findByEmployeeNumber).toHaveBeenCalledWith('EMP002');
    });

    it('should return null when employee number not found', async () => {
      mockRepo.findByEmployeeNumber.mockResolvedValueOnce(null);

      const result = await service.getEmployeeByNumber('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should propagate repository errors unchanged', async () => {
      mockRepo.findByEmployeeNumber.mockRejectedValueOnce(new Error('db error'));

      await expect(service.getEmployeeByNumber('EMP001')).rejects.toThrow('db error');
    });
  });

  describe('getSubordinates', () => {
    it('should return subordinates for a manager', async () => {
      const sub1 = makeEmployee({ id: 'emp-2', managerId: 'emp-mgr-1' });
      const sub2 = makeEmployee({ id: 'emp-3', managerId: 'emp-mgr-1' });
      mockRepo.findByManagerId.mockResolvedValueOnce([sub1, sub2]);

      const result = await service.getSubordinates('emp-mgr-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-2');
      expect(result[1].id).toBe('emp-3');
      expect(mockRepo.findByManagerId).toHaveBeenCalledWith('emp-mgr-1');
    });

    it('should return an empty array when no subordinates exist', async () => {
      mockRepo.findByManagerId.mockResolvedValueOnce([]);

      const result = await service.getSubordinates('emp-mgr-1');

      expect(result).toEqual([]);
    });

    it('should propagate repository errors unchanged', async () => {
      mockRepo.findByManagerId.mockRejectedValueOnce(new Error('db error'));

      await expect(service.getSubordinates('emp-mgr-1')).rejects.toThrow('db error');
    });
  });

  describe('getAllEmployees', () => {
    it('should return all employees', async () => {
      const emp1 = makeEmployee({ id: 'emp-1' });
      const emp2 = makeEmployee({ id: 'emp-2' });
      mockRepo.findAll.mockResolvedValueOnce([emp1, emp2]);

      const result = await service.getAllEmployees();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-1');
      expect(result[1].id).toBe('emp-2');
      expect(mockRepo.findAll).toHaveBeenCalled();
    });

    it('should return an empty array when no employees exist', async () => {
      mockRepo.findAll.mockResolvedValueOnce([]);

      const result = await service.getAllEmployees();

      expect(result).toEqual([]);
    });

    it('should propagate repository errors unchanged', async () => {
      mockRepo.findAll.mockRejectedValueOnce(new Error('db error'));

      await expect(service.getAllEmployees()).rejects.toThrow('db error');
    });
  });

  describe('createEmployee', () => {
    const createInput: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      employeeNumber: 'EMP-NEW',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      managerId: 'emp-mgr-1',
      department: 'Marketing',
      hireDate: new Date('2024-01-10T00:00:00.000Z'),
      terminationDate: null,
      employmentStatus: 'ACTIVE',
    };

    it('should create and return a fully-populated employee', async () => {
      const created = makeEmployee({
        id: 'emp-new',
        employeeNumber: 'EMP-NEW',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        managerId: 'emp-mgr-1',
        department: 'Marketing',
        hireDate: new Date('2024-01-10T00:00:00.000Z'),
        terminationDate: null,
        employmentStatus: 'ACTIVE',
        createdAt: new Date('2024-01-10T00:00:00.000Z'),
        updatedAt: new Date('2024-01-10T00:00:00.000Z'),
      });
      mockRepo.create.mockResolvedValueOnce(created);

      const result = await service.createEmployee(createInput);

      expect(result.id).toBe('emp-new');
      expect(result.employeeNumber).toBe('EMP-NEW');
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('jane.smith@example.com');
      expect(result.managerId).toBe('emp-mgr-1');
      expect(result.department).toBe('Marketing');
      expect(result.employmentStatus).toBe('ACTIVE');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockRepo.create).toHaveBeenCalledWith(createInput);
    });

    it('should propagate unique-constraint violations', async () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      mockRepo.create.mockRejectedValueOnce(uniqueError);

      await expect(service.createEmployee(createInput)).rejects.toThrow(
        'duplicate key value violates unique constraint',
      );
    });

    it('should propagate general repository errors', async () => {
      mockRepo.create.mockRejectedValueOnce(new Error('db error'));

      await expect(service.createEmployee(createInput)).rejects.toThrow('db error');
    });
  });

  describe('updateEmployee', () => {
    it('should update and return the updated employee', async () => {
      const updated = makeEmployee({
        firstName: 'Updated',
        department: 'Sales',
        updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      });
      mockRepo.update.mockResolvedValueOnce(updated);

      const result = await service.updateEmployee('emp-1', {
        firstName: 'Updated',
        department: 'Sales',
      });

      expect(result).not.toBeNull();
      expect(result!.firstName).toBe('Updated');
      expect(result!.department).toBe('Sales');
      expect(mockRepo.update).toHaveBeenCalledWith('emp-1', {
        firstName: 'Updated',
        department: 'Sales',
      });
    });

    it('should return null when no matching row exists', async () => {
      mockRepo.update.mockResolvedValueOnce(null);

      const result = await service.updateEmployee('nonexistent', { firstName: 'New Name' });

      expect(result).toBeNull();
    });

    it('should propagate repository errors unchanged', async () => {
      mockRepo.update.mockRejectedValueOnce(new Error('db error'));

      await expect(service.updateEmployee('emp-1', { firstName: 'New Name' })).rejects.toThrow('db error');
    });
  });

  describe('terminateEmployee', () => {
    it('should set employmentStatus to TERMINATED and terminationDate, then soft-delete', async () => {
      const beforeFreeze = new Date('2024-03-15T10:30:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(beforeFreeze);

      mockRepo.update.mockResolvedValueOnce(
        makeEmployee({
          employmentStatus: 'TERMINATED',
          terminationDate: new Date(),
        }),
      );
      mockRepo.softDelete.mockResolvedValueOnce();

      await service.terminateEmployee('emp-1');

      expect(mockRepo.update).toHaveBeenCalledWith('emp-1', {
        employmentStatus: 'TERMINATED',
        terminationDate: new Date(),
      });
      expect(mockRepo.softDelete).toHaveBeenCalledWith('emp-1');

      jest.useRealTimers();
    });

    it('should not call softDelete if update fails', async () => {
      const dbError = new Error('update failed');
      mockRepo.update.mockRejectedValueOnce(dbError);

      await expect(service.terminateEmployee('emp-1')).rejects.toThrow('update failed');
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });

    it('should propagate softDelete errors', async () => {
      mockRepo.update.mockResolvedValueOnce(
        makeEmployee({
          employmentStatus: 'TERMINATED',
          terminationDate: new Date(),
        }),
      );
      const deleteError = new Error('soft delete failed');
      mockRepo.softDelete.mockRejectedValueOnce(deleteError);

      await expect(service.terminateEmployee('emp-1')).rejects.toThrow('soft delete failed');
    });
  });
});
