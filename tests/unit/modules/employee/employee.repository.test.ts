import { EmploymentStatus } from '../../../../src/shared/types';
import { EmployeeRepository, IEmployeeRepository, Employee } from '../../../../src/modules/employee';

describe('EmployeeRepository (stub)', () => {
  let repository: IEmployeeRepository;

  const validCreateInput: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
    employeeNumber: 'E001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-15'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
  };

  beforeEach(() => {
    repository = new EmployeeRepository();
  });

  describe('findById', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findById('emp-001')).rejects.toThrow('not implemented');
    });
  });

  describe('findByEmployeeNumber', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findByEmployeeNumber('E001')).rejects.toThrow('not implemented');
    });
  });

  describe('findByManagerId', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findByManagerId('emp-001')).rejects.toThrow('not implemented');
    });
  });

  describe('findAll', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.findAll()).rejects.toThrow('not implemented');
    });
  });

  describe('create', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.create(validCreateInput)).rejects.toThrow('not implemented');
    });

    it('should accept input without id, createdAt, and updatedAt', async () => {
      // TypeScript compile-time check: this call compiles without error
      const input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
        employeeNumber: 'E002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        managerId: 'emp-001',
        department: 'HR',
        hireDate: new Date('2021-06-01'),
        terminationDate: null,
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      await expect(repository.create(input)).rejects.toThrow('not implemented');
    });
  });

  describe('update', () => {
    it('should throw "not implemented"', async () => {
      await expect(repository.update('emp-001', { firstName: 'Updated' })).rejects.toThrow(
        'not implemented',
      );
    });

    it('should accept a partial Employee update', async () => {
      const partialUpdate: Partial<Employee> = {
        department: 'Marketing',
        managerId: 'emp-002',
      };

      await expect(repository.update('emp-001', partialUpdate)).rejects.toThrow('not implemented');
    });

    it('should accept an empty partial update', async () => {
      await expect(repository.update('emp-001', {})).rejects.toThrow('not implemented');
    });
  });

  describe('interface contract', () => {
    it('should have all required methods', () => {
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findByEmployeeNumber).toBe('function');
      expect(typeof repository.findByManagerId).toBe('function');
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.update).toBe('function');
    });
  });
});
