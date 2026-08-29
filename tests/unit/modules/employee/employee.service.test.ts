jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import {
  CreateEmployeeInput,
  Employee,
  IEmployeeRepository
} from '../../../../src/modules/employee/employee.model';
import {
  NotFoundError,
  ValidationError
} from '../../../../src/shared/types/errors';

function makeInput(overrides: Partial<CreateEmployeeInput> = {}): CreateEmployeeInput {
  return {
    employeeNumber: 'E001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    managerId: null,
    department: null,
    hireDate: new Date('2024-01-01T00:00:00Z'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    ...overrides
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    employeeNumber: 'E001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    managerId: null,
    department: null,
    hireDate: new Date('2024-01-01T00:00:00Z'),
    terminationDate: null,
    employmentStatus: 'ACTIVE',
    ...overrides
  };
}

describe('EmployeeService', () => {
  let repository: jest.Mocked<IEmployeeRepository>;
  let service: EmployeeService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByEmail: jest.fn(),
      list: jest.fn()
    };
    service = new EmployeeService(repository);
  });

  describe('create', () => {
    it.each(['employeeNumber', 'firstName', 'lastName', 'email'] as const)(
      'throws ValidationError when %s is missing',
      async (field) => {
        const input = makeInput({ [field]: '' });

        await expect(service.create(input)).rejects.toBeInstanceOf(
          ValidationError
        );
      }
    );

    it('throws ValidationError when the employeeNumber already exists', async () => {
      repository.findByEmployeeNumber.mockResolvedValue(makeEmployee());

      await expect(service.create(makeInput())).rejects.toBeInstanceOf(
        ValidationError
      );
    });

    it('creates with a generated id and persists via the repository', async () => {
      repository.findByEmployeeNumber.mockResolvedValue(null);
      repository.create.mockImplementation(async (e) => e);

      const result = await service.create(makeInput());

      expect(result.id).toBeTruthy();
      expect(result.id).toHaveLength(36);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ employeeNumber: 'E001' }),
        undefined
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundError when the employee does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('missing', { firstName: 'X' })).rejects.toBeInstanceOf(
        NotFoundError
      );
    });

    it('merges the update onto the current employee', async () => {
      repository.findById.mockResolvedValue(makeEmployee());
      repository.update.mockImplementation(async (e) => e);

      const result = await service.update('emp-1', { firstName: 'Grace' });

      expect(result.firstName).toBe('Grace');
      expect(result.lastName).toBe('Lovelace');
    });
  });

  describe('terminate', () => {
    it('transitions to TERMINATED and sets terminationDate to now by default', async () => {
      repository.findById.mockResolvedValue(makeEmployee());
      repository.update.mockImplementation(async (e) => e);

      const result = await service.terminate('emp-1');

      expect(result.employmentStatus).toBe('TERMINATED');
      expect(result.terminationDate).toBeInstanceOf(Date);
    });

    it('uses an explicit terminationDate when provided', async () => {
      const date = new Date('2025-06-30T00:00:00Z');
      repository.findById.mockResolvedValue(makeEmployee());
      repository.update.mockImplementation(async (e) => e);

      const result = await service.terminate('emp-1', date);

      expect(result.terminationDate).toEqual(date);
    });

    it('throws NotFoundError for a missing employee', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.terminate('missing')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });
});
