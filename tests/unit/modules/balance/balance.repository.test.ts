import { ILeaveBalanceRepository, KnexLeaveBalanceRepository, RepositoryError } from '../../../../src/modules/balance/balance.repository';
import { LeaveBalance } from '../../../../src/modules/balance/balance.model';
import { LeaveType, LeaveBalanceStatus } from '../../../../src/shared/types/leave.types';
import { Knex } from 'knex';

interface TestRow {
  id: string;
  employeeId: string;
  leaveType: string;
  leavePolicyId: string;
  entitled: number;
  used: number;
  pending: number;
  carriedOver: number;
  remaining: number;
  year: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const now = new Date('2026-07-27T00:00:00.000Z');
const nowStr = now.toISOString();

function makeRow(overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: 'bal-001',
    employeeId: 'emp-001',
    leaveType: 'ANNUAL',
    leavePolicyId: 'pol-001',
    entitled: 20,
    used: 5,
    pending: 2,
    carriedOver: 3,
    remaining: 16,
    year: 2026,
    status: 'ACTIVE',
    createdAt: nowStr,
    updatedAt: nowStr,
    ...overrides,
  };
}

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: 'bal-001',
    employeeId: 'emp-001',
    leaveType: LeaveType.ANNUAL,
    leavePolicyId: 'pol-001',
    entitled: 20,
    used: 5,
    pending: 2,
    carriedOver: 3,
    remaining: 16,
    year: 2026,
    status: LeaveBalanceStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ILeaveBalanceRepository', () => {
  it('should extend IBaseRepository<LeaveBalance> with additional methods', () => {
    class TestBalanceRepo implements ILeaveBalanceRepository {
      async findById(_id: string): Promise<LeaveBalance | null> { return null; }
      async findAll(): Promise<LeaveBalance[]> { return []; }
      async findByEmployeeId(_employeeId: string): Promise<LeaveBalance[]> { return []; }
      async findByEmployeeIdAndYear(_employeeId: string, _year: number): Promise<LeaveBalance[]> { return []; }
      async findByEmployeeIdAndLeaveType(_employeeId: string, _leaveType: string, _year: number): Promise<LeaveBalance | null> { return null; }
      async findByStatus(_status: string): Promise<LeaveBalance[]> { return []; }
      async create(_entity: Omit<LeaveBalance, 'id'>): Promise<LeaveBalance> {
        return makeBalance();
      }
      async update(_id: string, _entity: Partial<LeaveBalance>): Promise<LeaveBalance | null> { return null; }
      async delete(_id: string): Promise<boolean> { return true; }
    }

    const repo = new TestBalanceRepo();
    expect(repo).toBeDefined();
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.findAll).toBe('function');
    expect(typeof repo.findByEmployeeId).toBe('function');
    expect(typeof repo.findByEmployeeIdAndYear).toBe('function');
    expect(typeof repo.findByEmployeeIdAndLeaveType).toBe('function');
    expect(typeof repo.findByStatus).toBe('function');
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.update).toBe('function');
    expect(typeof repo.delete).toBe('function');
  });
});

describe('KnexLeaveBalanceRepository', () => {
  let repo: KnexLeaveBalanceRepository;
  let mockKnex: jest.Mocked<Knex>;
  let mockQb: jest.Mocked<Knex.QueryBuilder>;

  beforeEach(() => {
    mockQb = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Knex.QueryBuilder>;

    mockKnex = jest.fn(() => mockQb) as unknown as jest.Mocked<Knex>;
    (mockKnex as unknown as Record<string, unknown>).QueryBuilder = {};
    (mockKnex as unknown as Record<string, unknown>).client = { config: { client: 'pg' } };

    repo = new KnexLeaveBalanceRepository(mockKnex);
  });

  describe('findById', () => {
    it('should return a LeaveBalance when found', async () => {
      const row = makeRow();
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findById('bal-001');

      expect(mockKnex).toHaveBeenCalledWith('leave_balances');
      expect(mockQb.where).toHaveBeenCalledWith({ id: 'bal-001' });
      expect(result).not.toBeNull();
      expect(result!.id).toBe('bal-001');
      expect(result!.employeeId).toBe('emp-001');
      expect(result!.leaveType).toBe(LeaveType.ANNUAL);
      expect(result!.leavePolicyId).toBe('pol-001');
      expect(result!.entitled).toBe(20);
      expect(result!.used).toBe(5);
      expect(result!.pending).toBe(2);
      expect(result!.carriedOver).toBe(3);
      expect(result!.remaining).toBe(16);
      expect(result!.year).toBe(2026);
      expect(result!.status).toBe(LeaveBalanceStatus.ACTIVE);
    });

    it('should return null when not found', async () => {
      mockQb.first = jest.fn().mockResolvedValue(null);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw RepositoryError when the query rejects', async () => {
      const dbError = new Error('connection refused');
      mockQb.first = jest.fn().mockRejectedValue(dbError);

      await expect(repo.findById('bal-001')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findAll', () => {
    it('should return all leave balances', async () => {
      const rows = [makeRow(), makeRow({ id: 'bal-002', leaveType: 'SICK', entitled: 10, remaining: 10 })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findAll();

      expect(mockQb.select).toHaveBeenCalledWith('*');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('bal-001');
      expect(result[1].id).toBe('bal-002');
    });

    it('should return empty array when no records', async () => {
      mockQb.select = jest.fn().mockResolvedValue([]);

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeId', () => {
    it('should return balances for a given employee', async () => {
      const rows = [makeRow(), makeRow({ id: 'bal-002', leaveType: 'SICK' })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findByEmployeeId('emp-001');

      expect(mockQb.where).toHaveBeenCalledWith({ employeeId: 'emp-001' });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when employee has no balances', async () => {
      mockQb.select = jest.fn().mockResolvedValue([]);

      const result = await repo.findByEmployeeId('emp-999');

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeIdAndYear', () => {
    it('should return balances for a given employee and year', async () => {
      const rows = [makeRow(), makeRow({ id: 'bal-002', leaveType: 'SICK' })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findByEmployeeIdAndYear('emp-001', 2026);

      expect(mockQb.where).toHaveBeenCalledWith({ employeeId: 'emp-001', year: 2026 });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no balances for that year', async () => {
      mockQb.select = jest.fn().mockResolvedValue([]);

      const result = await repo.findByEmployeeIdAndYear('emp-001', 2025);

      expect(result).toEqual([]);
    });
  });

  describe('findByEmployeeIdAndLeaveType', () => {
    it('should return a balance for a given employee, leave type, and year', async () => {
      const row = makeRow();
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findByEmployeeIdAndLeaveType('emp-001', 'ANNUAL', 2026);

      expect(mockQb.where).toHaveBeenCalledWith({ employeeId: 'emp-001', leaveType: 'ANNUAL', year: 2026 });
      expect(result).not.toBeNull();
      expect(result!.leaveType).toBe(LeaveType.ANNUAL);
      expect(result!.year).toBe(2026);
    });

    it('should return null when no matching balance', async () => {
      mockQb.first = jest.fn().mockResolvedValue(null);

      const result = await repo.findByEmployeeIdAndLeaveType('emp-001', 'SICK', 2026);

      expect(result).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('should return balances with a given status', async () => {
      const rows = [makeRow({ status: 'EXHAUSTED', remaining: 0 })];
      mockQb.select = jest.fn().mockResolvedValue(rows);

      const result = await repo.findByStatus('EXHAUSTED');

      expect(mockQb.where).toHaveBeenCalledWith({ status: 'EXHAUSTED' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveBalanceStatus.EXHAUSTED);
    });
  });

  describe('create', () => {
    it('should insert and return a new LeaveBalance', async () => {
      const row = makeRow();
      mockQb.returning = jest.fn().mockResolvedValue([row]);

      const input: Omit<LeaveBalance, 'id'> = {
        employeeId: 'emp-001',
        leaveType: LeaveType.ANNUAL,
        leavePolicyId: 'pol-001',
        entitled: 20,
        used: 5,
        pending: 2,
        carriedOver: 3,
        remaining: 16,
        year: 2026,
        status: LeaveBalanceStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      const result = await repo.create(input);

      expect(mockQb.insert).toHaveBeenCalledWith(input);
      expect(result.id).toBe('bal-001');
    });
  });

  describe('update', () => {
    it('should update and return the updated LeaveBalance', async () => {
      const row = makeRow({ used: 7, pending: 0, remaining: 14, updatedAt: nowStr });
      mockQb.returning = jest.fn().mockResolvedValue([row]);

      const result = await repo.update('bal-001', { used: 7, pending: 0, remaining: 14 });

      expect(mockQb.where).toHaveBeenCalledWith({ id: 'bal-001' });
      expect(result).not.toBeNull();
      expect(result!.used).toBe(7);
      expect(result!.pending).toBe(0);
      expect(result!.remaining).toBe(14);
    });

    it('should return null when updating nonexistent record', async () => {
      mockQb.returning = jest.fn().mockResolvedValue([]);

      const result = await repo.update('nonexistent', { used: 10 });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when a record is deleted', async () => {
      mockQb.delete = jest.fn().mockResolvedValue(1);

      const result = await repo.delete('bal-001');

      expect(mockQb.where).toHaveBeenCalledWith({ id: 'bal-001' });
      expect(result).toBe(true);
    });

    it('should return false when no record is deleted', async () => {
      mockQb.delete = jest.fn().mockResolvedValue(0);

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('toLeaveBalance (via findById)', () => {
    it('should parse date fields correctly', async () => {
      const row = makeRow({
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-06-15T12:00:00.000Z',
      });
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findById('bal-001');

      expect(result!.createdAt).toEqual(new Date('2025-01-01T00:00:00.000Z'));
      expect(result!.updatedAt).toEqual(new Date('2025-06-15T12:00:00.000Z'));
    });

    it('should handle numeric fields correctly', async () => {
      const row = makeRow({ entitled: 15, used: 0, pending: 0, carriedOver: 5, remaining: 20 });
      mockQb.first = jest.fn().mockResolvedValue(row);

      const result = await repo.findById('bal-001');

      expect(result!.entitled).toBe(15);
      expect(result!.used).toBe(0);
      expect(result!.pending).toBe(0);
      expect(result!.carriedOver).toBe(5);
      expect(result!.remaining).toBe(20);
    });
  });
});
