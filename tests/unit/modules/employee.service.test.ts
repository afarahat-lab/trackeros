import { Employee, CreateEmployeeInput } from '../../../src/modules/employee';
import { IEmployeeRepository } from '../../../src/modules/employee';
import { EmployeeService } from '../../../src/modules/employee';
import { ValidationError, NotFoundError, ConflictError } from '../../../src/shared/errors';
import { EmployeeRole, EmploymentStatus } from '../../../src/shared/types';

class FakeEmployeeRepository implements IEmployeeRepository {
  private rows: Employee[] = [];
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `emp-${this.sequence}`;
  }

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const employee: Employee = {
      id: this.nextId(),
      ...input,
    };
    this.rows.push(employee);
    return employee;
  }

  async findById(id: string): Promise<Employee | null> {
    return this.rows.find((e) => e.id === id) ?? null;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.rows.find((e) => e.employeeNumber === employeeNumber) ?? null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.rows.find((e) => e.email === email) ?? null;
  }
}

function makeInput(overrides: Partial<CreateEmployeeInput> = {}): CreateEmployeeInput {
  return {
    employeeNumber: 'EMP-001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    role: EmployeeRole.EMPLOYEE,
    managerId: null,
    department: 'Engineering',
    hireDate: new Date('2020-01-01T00:00:00.000Z'),
    terminationDate: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    ...overrides,
  };
}

describe('EmployeeService', () => {
  let repository: FakeEmployeeRepository;
  let service: EmployeeService;

  beforeEach(() => {
    repository = new FakeEmployeeRepository();
    service = new EmployeeService(repository);
  });

  describe('createEmployee', () => {
    it('returns an Employee whose id is defined and fields match input', async () => {
      const input = makeInput();
      const employee = await service.createEmployee(input);

      expect(employee.id).toBeDefined();
      expect(employee.employeeNumber).toBe(input.employeeNumber);
      expect(employee.firstName).toBe(input.firstName);
      expect(employee.lastName).toBe(input.lastName);
      expect(employee.email).toBe(input.email);
      expect(employee.role).toBe(input.role);
      expect(employee.managerId).toBe(input.managerId);
      expect(employee.department).toBe(input.department);
      expect(employee.hireDate).toBe(input.hireDate);
      expect(employee.terminationDate).toBe(input.terminationDate);
      expect(employee.employmentStatus).toBe(input.employmentStatus);
    });

    it('rejects invalid input (empty email) with ValidationError', async () => {
      const input = makeInput({ email: ' ' });
      await expect(service.createEmployee(input)).rejects.toThrow(ValidationError);
    });

    it('rejects duplicate employeeNumber with ConflictError', async () => {
      const input = makeInput();
      await service.createEmployee(input);

      const duplicate = makeInput({ email: 'other@example.com' });
      await expect(service.createEmployee(duplicate)).rejects.toThrow(ConflictError);
    });

    it('rejects duplicate email with ConflictError', async () => {
      const input = makeInput();
      await service.createEmployee(input);

      const duplicate = makeInput({ employeeNumber: 'EMP-002' });
      await expect(service.createEmployee(duplicate)).rejects.toThrow(ConflictError);
    });
  });

  describe('getEmployeeById', () => {
    it('returns the employee when found', async () => {
      const created = await service.createEmployee(makeInput());
      const found = await service.getEmployeeById(created.id);

      expect(found).toEqual(created);
    });

    it('throws NotFoundError when the id is unknown', async () => {
      await expect(service.getEmployeeById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
