
import { Pool } from 'pg';
import { LeavePolicyRepository } from '../../../../src/modules/leavePolicy/leavePolicy.repository';
import { LeavePolicy } from '../../../../src/modules/leavePolicy/leavePolicy.model';
import { PolicyStatus } from '../../../../src/shared/types/leave.enums';

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockQuery,
    })),
  };
});

describe('LeavePolicyRepository', () => {
  let repository: LeavePolicyRepository;
  let mockQuery: jest.Mock;

  const mockLeavePolicy: LeavePolicy = {
    id: 'lp-001',
    leaveTypeId: 'lt-001',
    name: 'Standard Annual Leave Policy',
    entitlementDaysPerYear: 20,
    maxCarryForwardDays: 5,
    minNoticeDays: 3,
    maxConsecutiveDays: 15,
    requiresApproval: true,
    effectiveFrom: new Date('2024-01-01T00:00:00.000Z'),
    effectiveTo: null,
    status: PolicyStatus.ACTIVE,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const pool = new Pool();
    mockQuery = pool.query as unknown as jest.Mock;
    repository = new LeavePolicyRepository(pool);
  });

  describe('findAll', () => {
    it('should return all leave policies ordered by name', async () => {
      const policies = [mockLeavePolicy];
      mockQuery.mockResolvedValueOnce({ rows: policies });

      const result = await repository.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies ORDER BY name ASC'
      );
      expect(result).toEqual(policies);
    });

    it('should return an empty array when no policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a leave policy when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeavePolicy] });

      const result = await repository.findById('lp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['lp-001']
      );
      expect(result).toEqual(mockLeavePolicy);
    });

    it('should return null when policy is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByLeaveTypeId', () => {
    it('should return policies for a given leave type', async () => {
      const policies = [mockLeavePolicy];
      mockQuery.mockResolvedValueOnce({ rows: policies });

      const result = await repository.findByLeaveTypeId('lt-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type_id = $1 ORDER BY name ASC',
        ['lt-001']
      );
      expect(result).toEqual(policies);
    });

    it('should return an empty array when no policies exist for the leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByLeaveTypeId('lt-999');

      expect(result).toEqual([]);
    });
  });

  describe('findActiveByLeaveTypeId', () => {
    it('should return the active policy for a leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockLeavePolicy] });

      const result = await repository.findActiveByLeaveTypeId('lt-001');

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM leave_policies WHERE leave_type_id = $1 AND status = 'ACTIVE' ORDER BY effective_from DESC LIMIT 1",
        ['lt-001']
      );
      expect(result).toEqual(mockLeavePolicy);
    });

    it('should return null when no active policy exists for the leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findActiveByLeaveTypeId('lt-001');

      expect(result).toBeNull();
    });
  });
});
