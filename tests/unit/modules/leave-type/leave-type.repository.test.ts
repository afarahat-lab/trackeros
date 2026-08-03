import { Pool } from 'pg';
import { LeaveTypeRepository } from '../../../../src/modules/leave-type/leave-type.repository';
import { LeaveType } from '../../../../src/modules/leave-type/leave-type.model';
import { LeaveTypeCode } from '../../../../src/shared/types/leave-type-code.enum';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
    })),
  };
});

const mockLeaveTypeRow: Record<string, unknown> = {
  id: 'lt-001',
  code: 'ANNUAL',
  name: 'Annual Leave',
  description: 'Paid annual vacation leave',
  is_active: true,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-06-01T00:00:00.000Z',
};

const mockInactiveLeaveTypeRow: Record<string, unknown> = {
  id: 'lt-002',
  code: 'UNPAID',
  name: 'Unpaid Leave',
  description: null,
  is_active: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-03-01T00:00:00.000Z',
};

function expectLeaveTypeMatchesRow(leaveType: LeaveType, row: Record<string, unknown>): void {
  expect(leaveType.id).toBe(row.id);
  expect(leaveType.code).toBe(row.code);
  expect(leaveType.name).toBe(row.name);
  expect(leaveType.description).toBe(row.description ?? undefined);
  expect(leaveType.isActive).toBe(row.is_active);
  expect(leaveType.createdAt).toEqual(new Date(row.created_at as string));
  expect(leaveType.updatedAt).toEqual(new Date(row.updated_at as string));
}

describe('LeaveTypeRepository', () => {
  let repository: LeaveTypeRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockPool = new Pool() as jest.Mocked<Pool>;
    mockQuery = mockPool.query as unknown as jest.Mock;
    repository = new LeaveTypeRepository(mockPool);
  });

  describe('findById', () => {
    it('should return a LeaveType when a row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveTypeRow] });

      const result = await repository.findById('lt-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE id = $1',
        ['lt-001'],
      );
      expect(result).not.toBeNull();
      expectLeaveTypeMatchesRow(result!, mockLeaveTypeRow);
    });

    it('should return null when no row matches the given id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findById("1' OR '1'='1");

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE id = $1',
        ["1' OR '1'='1"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findById('lt-001')).rejects.toThrow(
        'Failed to find leave type by id: connection refused',
      );
    });
  });

  describe('findByCode', () => {
    it('should return a LeaveType when a row matches the given code', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveTypeRow] });

      const result = await repository.findByCode(LeaveTypeCode.ANNUAL);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE code = $1',
        ['ANNUAL'],
      );
      expect(result).not.toBeNull();
      expectLeaveTypeMatchesRow(result!, mockLeaveTypeRow);
    });

    it('should return null when no row matches the given code', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByCode(LeaveTypeCode.MATERNITY);

      expect(result).toBeNull();
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.findByCode("ANNUAL'; DROP TABLE leave_types; --" as LeaveTypeCode);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE code = $1',
        ["ANNUAL'; DROP TABLE leave_types; --"],
      );
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findByCode(LeaveTypeCode.ANNUAL)).rejects.toThrow(
        'Failed to find leave type by code: connection refused',
      );
    });
  });

  describe('findAllActive', () => {
    it('should return all active leave types when rows exist', async () => {
      const mockSickRow: Record<string, unknown> = {
        id: 'lt-003',
        code: 'SICK',
        name: 'Sick Leave',
        description: 'Paid sick leave',
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-04-01T00:00:00.000Z',
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveTypeRow, mockSickRow] });

      const result = await repository.findAllActive();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE is_active = true',
      );
      expect(result).toHaveLength(2);
      expectLeaveTypeMatchesRow(result[0], mockLeaveTypeRow);
      expectLeaveTypeMatchesRow(result[1], mockSickRow);
    });

    it('should return an empty array when no active rows exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAllActive();

      expect(result).toEqual([]);
    });

    it('should not return inactive leave types', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveTypeRow] });

      const result = await repository.findAllActive();

      expect(result).toHaveLength(1);
      result.forEach((lt) => {
        expect(lt.isActive).toBe(true);
      });
    });

    it('should throw when the pool query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repository.findAllActive()).rejects.toThrow(
        'Failed to find all active leave types: connection refused',
      );
    });
  });

  describe('description nullability', () => {
    it('should preserve undefined description when row has null description', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockInactiveLeaveTypeRow] });

      const result = await repository.findById('lt-002');

      expect(result).not.toBeNull();
      expect(result!.description).toBeUndefined();
    });

    it('should preserve string description when row has a description', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveTypeRow] });

      const result = await repository.findById('lt-001');

      expect(result).not.toBeNull();
      expect(result!.description).toBe('Paid annual vacation leave');
    });
  });

  describe('isActive filtering', () => {
    it('should return a leave type via findById regardless of active state', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockInactiveLeaveTypeRow] });

      const result = await repository.findById('lt-002');

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
    });

    it('should return a leave type via findByCode regardless of active state', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockInactiveLeaveTypeRow] });

      const result = await repository.findByCode(LeaveTypeCode.UNPAID);

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
    });
  });
});
