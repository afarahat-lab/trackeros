import { EmployeeService } from 'modules/employee/employee.service';
import {
  Employee,
  IEmployeeRepository,
  DuplicateEmployeeNumberError,
  EmployeeNotFoundError,
  EmployeeAlreadyTerminatedError,
} from 'modules/employee/employee.model';

function makeMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: '1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-01'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-06-01'),
    deletedAt: null,
    ...overrides,
  };
}

function createMockRepo(): jest.Mocked<IEmployeeRepository> {
  return {
    findById: jest.fn(),
    findByEmployeeNumber: jest.fn(),
    findAll: jest.fn(),
    findByManagerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

describe('EmployeeService', () => {
  let service: EmployeeService;
  let repo: jest.Mocked<IEmployeeRepository>;

  beforeEach(() => {
    repo = createMockRepo();
    service = new EmployeeService(repo);
  });

  describe('getById', () => {
    it('returns employee when found', async () => {
      const emp = makeMockEmployee();
      repo.findById.mockResolvedValue(emp);

      const result = await service.getById('1');
      expect(result).toEqual(emp);
    });

    it('throws EmployeeNotFoundError when not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(
        EmployeeNotFoundError
      );
    });
  });

  describe('getByEmployeeNumber', () => {
    it('returns employee when found', async () => {
      const emp = makeMockEmployee();
      repo.findByEmployeeNumber.mockResolvedValue(emp);

      const result = await service.getByEmployeeNumber('EMP001');
      expect(result).toEqual(emp);
    });

    it('throws EmployeeNotFoundError when not found', async () => {
      repo.findByEmployeeNumber.mockResolvedValue(null);

      await expect(
        service.getByEmployeeNumber('NONEXISTENT')
      ).rejects.toThrow(EmployeeNotFoundError);
    });
  });

  describe('getAll', () => {
    it('returns all employees from repository', async () => {
      const emps = [makeMockEmployee(), makeMockEmployee({ id: '2', employeeNumber: 'EMP002' })];
      repo.findAll.mockResolvedValue(emps);

      const result = await service.getAll();
      expect(result).toEqual(emps);
    });

    it('returns empty array when no employees', async () => {
      repo.findAll.mockResolvedValue([]);

      const result = await service.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getSubordinates', () => {
    it('returns employees for given manager', async () => {
      const emps = [makeMockEmployee({ id: '2', managerId: '1' })];
      repo.findByManagerId.mockResolvedValue(emps);

      const result = await service.getSubordinates('1');
      expect(result).toEqual(emps);
      expect(repo.findByManagerId).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    it('delegates to repository and returns created employee', async () => {
      const input = {
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        managerId: null,
        department: 'Engineering',
        hireDate: new Date('2020-01-01'),
        terminationDate: null,
        employmentStatus: 'ACTIVE' as const,
      };
      const created = makeMockEmployee();
      repo.create.mockResolvedValue(created);

      const result = await service.create(input);
      expect(result).toEqual(created);
    });

    it('propagates DuplicateEmployeeNumberError from repository', async () => {
      repo.create.mockRejectedValue(
        new DuplicateEmployeeNumberError('EMP001')
      );

      await expect(
        service.create({
          employeeNumber: 'EMP001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          managerId: null,
          department: 'Engineering',
          hireDate: new Date('2020-01-01'),
          terminationDate: null,
          employmentStatus: 'ACTIVE',
        })
      ).rejects.toThrow(DuplicateEmployeeNumberError);
    });
  });

  describe('update', () => {
    it('returns updated employee', async () => {
      const updated = makeMockEmployee({ firstName: 'Jane' });
      repo.update.mockResolvedValue(updated);

      const result = await service.update('1', { firstName: 'Jane' });
      expect(result).toEqual(updated);
    });

    it('throws EmployeeNotFoundError when employee does not exist', async () => {
      repo.update.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { firstName: 'Jane' })
      ).rejects.toThrow(EmployeeNotFoundError);
    });
  });

  describe('terminate', () => {
    it('sets employmentStatus to TERMINATED and sets terminationDate', async () => {
      const active = makeMockEmployee({ employmentStatus: 'ACTIVE' });
      repo.findById.mockResolvedValue(active);

      const terminated = makeMockEmployee({
        employmentStatus: 'TERMINATED',
        terminationDate: new Date(),
      });
      repo.update.mockResolvedValue(terminated);

      const result = await service.terminate('1');
      expect(result.employmentStatus).toBe('TERMINATED');
      expect(repo.update).toHaveBeenCalledWith('1', {
        employmentStatus: 'TERMINATED',
        terminationDate: expect.any(Date) as unknown as Date,
      });
    });

    it('throws EmployeeNotFoundError when employee does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.terminate('nonexistent')).rejects.toThrow(
        EmployeeNotFoundError
      );
    });

    it('throws EmployeeAlreadyTerminatedError when already terminated', async () => {
      const terminated = makeMockEmployee({
        employmentStatus: 'TERMINATED',
        terminationDate: new Date(),
      });
      repo.findById.mockResolvedValue(terminated);

      await expect(service.terminate('1')).rejects.toThrow(
        EmployeeAlreadyTerminatedError
      );
    });
  });
});
