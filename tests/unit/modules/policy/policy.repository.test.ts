jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { PgLeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import { LeavePolicy } from '../../../../src/modules/policy/policy.model';
import { pool } from '../../../../src/shared/db/connection';

const queryMock = (pool as unknown as { query: jest.Mock }).query;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pol-1',
    policy_name: 'Annual Leave',
    leave_type_id: 'lt-1',
    entitlement_days: 20,
    accrual_rate: null,
    max_accumulation: null,
    minimum_notice_days: 5,
    requires_manager_approval: true,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

function makePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveTypeId: 'lt-1',
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: 5,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

describe('PgLeavePolicyRepository', () => {
  let repo: PgLeavePolicyRepository;

  beforeEach(() => {
    queryMock.mockReset();
    repo = new PgLeavePolicyRepository();
  });

  describe('mapRow', () => {
    it('maps every camelCase field and preserves nullables', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      const result = await repo.findById('pol-1');

      expect(result).toEqual({
        id: 'pol-1',
        policyName: 'Annual Leave',
        leaveTypeId: 'lt-1',
        entitlementDays: 20,
        accrualRate: null,
        maxAccumulation: null,
        minimumNoticeDays: 5,
        requiresManagerApproval: true,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z')
      });
    });
  });

  describe('create', () => {
    it('persists all columns and returns a mapped policy', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      const result = await repo.create(makePolicy());

      expect(result.policyName).toBe('Annual Leave');
      expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it('uses the provided client when given', async () => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [makeRow()] }) };
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      await repo.create(makePolicy(), client as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe('lookups', () => {
    it('returns null when findByLeaveTypeId has no rows', async () => {
      queryMock.mockResolvedValue({ rows: [] });

      await expect(repo.findByLeaveTypeId('none')).resolves.toEqual([]);
    });

    it('maps a list of policies for a leave type', async () => {
      queryMock.mockResolvedValue({
        rows: [
          makeRow({ id: 'pol-1' }),
          makeRow({ id: 'pol-2', policy_name: 'Sick Leave' })
        ]
      });

      const results = await repo.findByLeaveTypeId('lt-1');

      expect(results).toHaveLength(2);
      expect(results.map((p) => p.policyName)).toEqual([
        'Annual Leave',
        'Sick Leave'
      ]);
    });

    it('returns mapping for findActive', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ is_active: true })] });

      const results = await repo.findActive();

      expect(results).toHaveLength(1);
      expect(results[0].isActive).toBe(true);
    });
  });
});
