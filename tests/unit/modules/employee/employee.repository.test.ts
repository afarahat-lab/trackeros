import { EmployeeRepository, Employee } from '../../../../src/modules/employee';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {},
}));

function createMockChain(resolvedValue: unknown) {
  const methods: Record<string, jest.Mock> = {
    select: jest.fn(),
    where: jest.fn(),
    whereNull: jest.fn(),
    first: jest.fn(),
    insert: jest.fn(),
  };

  const chain: Record<string, unknown> = {};

  for (const [name, mockFn] of Object.entries(methods)) {
    chain[name] = mockFn;
    mockFn.mockReturnValue(chain);
  }

  // Make the chain thenable so `await` works
  chain.then = (resolve: (value: unknown) => unknown) => {
    return Promise.resolve(resolvedValue).then(resolve);
  };

  return chain;
}

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new EmployeeRepository();
  });

  function setDb(resolvedValue: unknown) {
    const chain = createMockChain(resolvedValue);
    const dbFn = jest.fn(() => chain);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (repository as unknown as { db: unknown }).db = dbFn;
    return chain;
  }

  describe('findById', () => {
    it('should return Employee when a non-deleted row matches the id', async () => {
      const mockRow = {
        id: 'emp-1',
        employee_number: 'E001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        role: 'employee' as const,
        manager_id: 'mgr-1',
        department: 'Engineering',
        hire_date: new Date('2020-01-15'),
        termination_date: null,
        employment_status: 'ACTIVE' as const,
        created_at: new Date('2020-01-15T08:00:00Z'),
        updated_at: new Date('2024-01-01T12:00:00Z'),
        deleted_at: null,
      };

      const chain = setDb([mockRow]);

      const result = await repository.findById('emp-1');

      expect(result).not.toBeNull();
      expect(result).toEqual<Employee>({
        id: 'emp-1',
        employeeNumber: 'E001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'employee',
        managerId: 'mgr-1',
        department: 'Engineering',
        hireDate: mockRow.hire_date,
        terminationDate: null,
        employmentStatus: 'ACTIVE',
        createdAt: mockRow.created_at,
        updatedAt: mockRow.updated_at,
        deletedAt: null,
      });

      expect(chain.select).toHaveBeenCalledWith('*');
      expect(chain.where).toHaveBeenCalledWith('id', 'emp-1');
      expect(chain.whereNull).toHaveBeenCalledWith('deleted_at');
    });

    it('should return null when no non-deleted row matches the id', async () => {
      setDb([]);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when the matching row is soft-deleted', async () => {
      setDb([]);

      const result = await repository.findById('deleted-emp');

      expect(result).toBeNull();
    });
  });

  describe('findByManagerId', () => {
    it('should return employees for a given manager', async () => {
      const mockRows = [
        {
          id: 'emp-2',
          employee_number: 'E002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          role: 'employee' as const,
          manager_id: 'mgr-1',
          department: 'Engineering',
          hire_date: new Date('2021-03-01'),
          termination_date: null,
          employment_status: 'ACTIVE' as const,
          created_at: new Date('2021-03-01T08:00:00Z'),
          updated_at: new Date('2024-01-01T12:00:00Z'),
          deleted_at: null,
        },
      ];

      const chain = setDb(mockRows);

      const result = await repository.findByManagerId('mgr-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-2');
      expect(chain.where).toHaveBeenCalledWith('manager_id', 'mgr-1');
      expect(chain.whereNull).toHaveBeenCalledWith('deleted_at');
    });

    it('should return empty array when manager has no direct reports', async () => {
      setDb([]);

      const result = await repository.findByManagerId('mgr-empty');

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted employees', async () => {
      const mockRows = [
        {
          id: 'emp-1',
          employee_number: 'E001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          role: 'employee' as const,
          manager_id: null,
          department: null,
          hire_date: new Date('2020-01-15'),
          termination_date: null,
          employment_status: 'ACTIVE' as const,
          created_at: new Date('2020-01-15T08:00:00Z'),
          updated_at: new Date('2024-01-01T12:00:00Z'),
          deleted_at: null,
        },
      ];

      const chain = setDb(mockRows);

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(chain.whereNull).toHaveBeenCalledWith('deleted_at');
    });

    it('should return empty array when no employees exist', async () => {
      setDb([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create and return a new employee with system-generated fields', async () => {
      const input: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
        employeeNumber: 'E003',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        role: 'employee',
        managerId: null,
        department: 'HR',
        hireDate: new Date('2022-06-01'),
        terminationDate: null,
        employmentStatus: 'ACTIVE',
      };

      const insertedRow = {
        id: 'generated-id',
        employee_number: 'E003',
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@example.com',
        role: 'employee' as const,
        manager_id: null,
        department: 'HR',
        hire_date: new Date('2022-06-01'),
        termination_date: null,
        employment_status: 'ACTIVE' as const,
        created_at: new Date('2024-01-01T12:00:00Z'),
        updated_at: new Date('2024-01-01T12:00:00Z'),
        deleted_at: null,
      };

      const insertChain = createMockChain(undefined);
      const selectChain = createMockChain(insertedRow);

      let callCount = 0;
      const dbFn = jest.fn((_table: string) => {
        callCount++;
        return callCount === 1 ? insertChain : selectChain;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (repository as unknown as { db: unknown }).db = dbFn;

      const result = await repository.create(input);

      expect(result.id).toBe('generated-id');
      expect(result.employeeNumber).toBe('E003');
      expect(result.email).toBe('alice@example.com');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.deletedAt).toBeNull();
    });
  });
});
