import type { PoolClient } from 'pg';

import { EmploymentStatus } from '../../../../src/shared/types';
import { EmployeeService } from '../../../../src/modules/employee/employee.service';
import type { IEmployeeRepository } from '../../../../src/modules/employee/employee.repository';
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '../../../../src/modules/employee/employee.model';

const employeeFixture = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  employeeNumber: 'E001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  managerId: null,
  department: 'Engineering',
  hireDate: new Date('2026-01-01T00:00:00.000Z'),
  terminationDate: null,
  employmentStatus: EmploymentStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

describe('EmployeeService', () => {
  let repository: IEmployeeRepository;
  let service: EmployeeService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      findByEmail: jest.fn(),
      findByManager: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new EmployeeService(repository);
  });

  it('defaults to the concrete EmployeeRepository when none is injected', () => {
    const defaultService = new EmployeeService();
    expect(defaultService).toBeInstanceOf(EmployeeService);
  });

  describe('create', () => {
    it('delegates to the repository and returns the persisted employee', async () => {
      const input: CreateEmployeeInput = {
        employeeNumber: 'E001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      };
      const persisted = employeeFixture();
      (repository.create as jest.Mock).mockResolvedValueOnce(persisted);

      const client = {} as PoolClient;
      await expect(service.create(input, client)).resolves.toBe(persisted);
      expect(repository.create).toHaveBeenCalledWith(input, client);
    });

    it('creates without a client for single-step callers', async () => {
      const persisted = employeeFixture();
      (repository.create as jest.Mock).mockResolvedValueOnce(persisted);

      await service.create({
        employeeNumber: 'E002',
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
        hireDate: new Date('2026-01-01T00:00:00.000Z'),
      });
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect((repository.create as jest.Mock).mock.calls[0][1]).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('delegates to the repository and returns null for a missing record', async () => {
      (repository.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.findById('emp-unknown')).resolves.toBeNull();
      expect(repository.findById).toHaveBeenCalledWith('emp-unknown');
    });
  });

  describe('findByEmployeeNumber', () => {
    it('delegates to the repository', async () => {
      (repository.findByEmployeeNumber as jest.Mock).mockResolvedValueOnce(employeeFixture());

      await expect(service.findByEmployeeNumber('E001')).resolves.toEqual(employeeFixture());
      expect(repository.findByEmployeeNumber).toHaveBeenCalledWith('E001');
    });
  });

  describe('findByEmail', () => {
    it('delegates to the repository', async () => {
      (repository.findByEmail as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.findByEmail('ada@example.com')).resolves.toBeNull();
      expect(repository.findByEmail).toHaveBeenCalledWith('ada@example.com');
    });
  });

  describe('findByManager', () => {
    it('returns an empty list when the manager has no reports', async () => {
      (repository.findByManager as jest.Mock).mockResolvedValueOnce([]);

      await expect(service.findByManager('mgr-1')).resolves.toEqual([]);
      expect(repository.findByManager).toHaveBeenCalledWith('mgr-1');
    });
  });

  describe('update', () => {
    it('delegates to the repository and returns the updated employee', async () => {
      const changes: UpdateEmployeeInput = { department: 'Research' };
      const updated = employeeFixture({ department: 'Research' });
      (repository.update as jest.Mock).mockResolvedValueOnce(updated);

      const client = {} as PoolClient;
      await expect(service.update('emp-1', changes, client)).resolves.toBe(updated);
      expect(repository.update).toHaveBeenCalledWith('emp-1', changes, client);
    });
  });

  describe('softDelete', () => {
    it('delegates to the repository and returns the soft-deleted employee', async () => {
      const deleted = employeeFixture({
        deletedAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      });
      (repository.softDelete as jest.Mock).mockResolvedValueOnce(deleted);

      const client = {} as PoolClient;
      await expect(service.softDelete('emp-1', client)).resolves.toBe(deleted);
      expect(repository.softDelete).toHaveBeenCalledWith('emp-1', client);
    });
  });
});
