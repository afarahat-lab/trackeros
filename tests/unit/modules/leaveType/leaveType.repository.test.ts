import { Pool } from 'pg';
import { LeaveTypeRepository } from '../../../../src/modules/leaveType/leaveType.repository';
import { LeaveType, LeaveTypeStatus } from '../../../../src/modules/leaveType/leaveType.model';
import { LeaveTypeCode } from '../../../../src/shared/types/leave.enums';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
    })),
  };
});

describe('LeaveTypeRepository', () => {
  let repository: LeaveTypeRepository;
  let mockQuery: jest.Mock;

  const mockLeaveType: LeaveType = {
    id: 'lt-001',
    code: LeaveTypeCode.ANNUAL,
    label: 'Annual Leave',
    description: 'Standard annual leave entitlement',
    requiresDocumentation: false,
    maxConsecutiveDays: 20,
    isPaid: true,
    status: LeaveTypeStatus.ACTIVE,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const pool = new Pool();
    mockQuery = pool.query as unknown as jest.Mock;
    repository = new LeaveTypeRepository(pool);
  });

  describe('findAll', () => {
    it('should return all leave types ordered by label', async () => {
      const leaveTypes = [mockLeaveType];
      mockQuery.mockResolvedValueOnce({ rows: leaveTypes });

      const result = await repository.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types ORDER BY label ASC'
      );
      expect(result).toEqual(leaveTypes);
    });

    it('should return an empty array when no leave types exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a leave type when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveType] });

      const result = await repository.findById('lt-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE id = $1',
        ['lt-001']
      );
      expect(result).toEqual(mockLeaveType);
    });

    it('should return null when leave type is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('should return a leave type when found by code', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeaveType] });

      const result = await repository.findByCode(LeaveTypeCode.ANNUAL);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_types WHERE code = $1',
        [LeaveTypeCode.ANNUAL]
      );
      expect(result).toEqual(mockLeaveType);
    });

    it('should return null when code is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByCode('NONEXISTENT');

      expect(result).toBeNull();
    });
  });
});
