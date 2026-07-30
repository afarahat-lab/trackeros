import { PgLeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { LeaveType } from '../../../../src/shared/types/index';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockQuery = jest.fn();
  return {
    pool: {
      query: mockQuery,
    },
    __mockQuery: mockQuery,
  };
});

const { __mockQuery } = jest.requireMock('../../../../src/shared/db/connection') as { __mockQuery: jest.Mock };

describe('PgLeavePolicyRepository', () => {
  let repository: PgLeavePolicyRepository;
  let mockQuery: jest.Mock;

  const mockRow = {
    id: 'pol-1',
    policy_name: 'Annual Leave',
    leave_type: 'annual',
    entitlement_days: 20,
    accrual_rate: null,
    max_accumulation: null,
    minimum_notice_days: 7,
    requires_manager_approval: true,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  };

  const mockPolicy: LeavePolicy = {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: undefined,
    maxAccumulation: undefined,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = __mockQuery;
    repository = new PgLeavePolicyRepository();
  });

  describe('findById', () => {
    it('should return a policy when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.findById('pol-1');

      expect(result).toEqual(mockPolicy);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at FROM leave_policies WHERE id = $1',
        ['pol-1']
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.findById('pol-1')).rejects.toThrow(
        'Failed to find policy by id: Connection refused'
      );
    });
  });

  describe('findByLeaveType', () => {
    it('should return a policy when found by leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.findByLeaveType(LeaveType.ANNUAL);

      expect(result).toEqual(mockPolicy);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at FROM leave_policies WHERE leave_type = $1',
        ['annual']
      );
    });

    it('should return null when leave type not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByLeaveType(LeaveType.SICK);

      expect(result).toBeNull();
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.findByLeaveType(LeaveType.ANNUAL)).rejects.toThrow(
        'Failed to find policy by leave type: Connection refused'
      );
    });
  });

  describe('findAllActive', () => {
    it('should return all active policies', async () => {
      const row2 = { ...mockRow, id: 'pol-2', policy_name: 'Sick Leave', leave_type: 'sick' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow, row2] });

      const result = await repository.findAllActive();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockPolicy);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at FROM leave_policies WHERE is_active = true ORDER BY policy_name'
      );
    });

    it('should return empty array when no active policies', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAllActive();

      expect(result).toEqual([]);
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.findAllActive()).rejects.toThrow(
        'Failed to find active policies: Connection refused'
      );
    });
  });

  describe('create', () => {
    const createInput = {
      policyName: 'Annual Leave',
      leaveType: LeaveType.ANNUAL,
      entitlementDays: 20,
      accrualRate: undefined,
      maxAccumulation: undefined,
      minimumNoticeDays: 7,
      requiresManagerApproval: true,
      isActive: true,
    };

    it('should create and return a new policy', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.create(createInput);

      expect(result).toEqual(mockPolicy);
      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_policies (policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at`,
        ['Annual Leave', 'annual', 20, null, null, 7, true, true]
      );
    });

    it('should throw an error on unique constraint violation', async () => {
      mockQuery.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

      await expect(repository.create(createInput)).rejects.toThrow(
        'Failed to create policy: duplicate key value violates unique constraint'
      );
    });
  });

  describe('update', () => {
    it('should update and return the policy', async () => {
      const updatedRow = { ...mockRow, policy_name: 'Updated Annual', updated_at: '2024-01-03T00:00:00.000Z' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repository.update('pol-1', { policyName: 'Updated Annual' });

      expect(result).toEqual({
        ...mockPolicy,
        policyName: 'Updated Annual',
        updatedAt: new Date('2024-01-03T00:00:00.000Z'),
      });
    });

    it('should return null when policy does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.update('nonexistent', { policyName: 'New' });

      expect(result).toBeNull();
    });

    it('should return current row when empty partial is provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await repository.update('pol-1', {});

      expect(result).toEqual(mockPolicy);
      // Should call findById when no fields to update
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active, created_at, updated_at FROM leave_policies WHERE id = $1',
        ['pol-1']
      );
    });

    it('should throw an error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repository.update('pol-1', { policyName: 'New' })).rejects.toThrow(
        'Failed to update policy: Connection refused'
      );
    });
  });
});
