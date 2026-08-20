import { PgLeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveType } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makePolicyRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? 'pol-1',
    policy_name: overrides.policy_name ?? 'Annual Leave Policy',
    leave_type: overrides.leave_type ?? 'annual',
    entitlement_days: overrides.entitlement_days ?? 20,
    accrual_rate: (overrides.accrual_rate ?? 1.67) as number | undefined,
    max_accumulation: (overrides.max_accumulation ?? 30) as number | undefined,
    minimum_notice_days: overrides.minimum_notice_days ?? 3,
    requires_manager_approval: (overrides.requires_manager_approval ?? true) as boolean,
    is_active: (overrides.is_active ?? true) as boolean,
    created_at: overrides.created_at ?? new Date('2020-01-01T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2020-01-01T00:00:00Z'),
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave Policy',
    leaveType: LeaveType.annual,
    entitlementDays: 20,
    accrualRate: 1.67,
    maxAccumulation: 30,
    minimumNoticeDays: 3,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('PgLeavePolicyRepository', () => {
  let repo: PgLeavePolicyRepository;

  beforeEach(() => {
    repo = new PgLeavePolicyRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return LeavePolicy when row exists', async () => {
      const row = makePolicyRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('pol-1');

      expect(result).toEqual(makePolicy());
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['pol-1'],
      );
    });

    it('should return null when no matching row found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByLeaveType', () => {
    it('should return LeavePolicy when leave type matches', async () => {
      const row = makePolicyRow({ leave_type: 'sick' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByLeaveType(LeaveType.sick);

      expect(result).toEqual(makePolicy({ leaveType: LeaveType.sick }));
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        ['sick'],
      );
    });

    it('should return null when no policy exists for the leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveType(LeaveType.emergency);

      expect(result).toBeNull();
    });

    it('should return at most one policy per leave type', async () => {
      const row = makePolicyRow({ leave_type: 'annual' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByLeaveType(LeaveType.annual);

      expect(result).not.toBeNull();
      expect(result!.leaveType).toBe(LeaveType.annual);
    });
  });

  describe('findAllActive', () => {
    it('should return only policies where is_active = true', async () => {
      const row1 = makePolicyRow({ id: 'pol-1', is_active: true });
      const row2 = makePolicyRow({ id: 'pol-2', is_active: true, leave_type: 'sick' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAllActive();

      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(true);
      expect(result[1].isActive).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true',
      );
    });

    it('should return empty array when no active policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAllActive();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert a new policy and return the created LeavePolicy', async () => {
      const input = {
        policyName: 'Sick Leave Policy',
        leaveType: LeaveType.sick,
        entitlementDays: 10,
        accrualRate: 0.83,
        maxAccumulation: 15,
        minimumNoticeDays: 1,
        requiresManagerApproval: false,
        isActive: true,
      };
      const row = makePolicyRow({
        id: 'pol-2',
        policy_name: 'Sick Leave Policy',
        leave_type: 'sick',
        entitlement_days: 10,
        accrual_rate: 0.83,
        max_accumulation: 15,
        minimum_notice_days: 1,
        requires_manager_approval: false,
        is_active: true,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(result).toEqual(
        makePolicy({
          id: 'pol-2',
          policyName: 'Sick Leave Policy',
          leaveType: LeaveType.sick,
          entitlementDays: 10,
          accrualRate: 0.83,
          maxAccumulation: 15,
          minimumNoticeDays: 1,
          requiresManagerApproval: false,
        }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        [
          'Sick Leave Policy',
          'sick',
          10,
          0.83,
          15,
          1,
          false,
          true,
        ],
      );
    });
  });

  describe('update', () => {
    it('should update policy fields and return the updated LeavePolicy', async () => {
      const row = makePolicyRow({
        entitlement_days: 25,
        minimum_notice_days: 5,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('pol-1', {
        entitlementDays: 25,
        minimumNoticeDays: 5,
      });

      expect(result).toEqual(
        makePolicy({ entitlementDays: 25, minimumNoticeDays: 5 }),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        expect.arrayContaining(['pol-1', 25, 5]),
      );
    });

    it('should return null when policy does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { entitlementDays: 30 });

      expect(result).toBeNull();
    });

    it('should return existing policy when no valid keys are provided', async () => {
      const row = makePolicyRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('pol-1', {});

      expect(result).toEqual(makePolicy());
    });
  });
});
