import { PgLeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveType } from '../../../../src/shared/types/leave.types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'pol-001',
    policy_name: 'Annual Leave',
    leave_type: 'annual',
    entitlement_days: 20,
    accrual_rate: null,
    max_accumulation: null,
    minimum_notice_days: 7,
    requires_manager_approval: true,
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeLeavePolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-001',
    policyName: 'Annual Leave',
    leaveType: LeaveType.ANNUAL,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-06-01T00:00:00.000Z'),
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
    it('returns the policy when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('pol-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['pol-001'],
      );
      expect(result).toEqual(makeLeavePolicy());
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('pol-999');

      expect(result).toBeNull();
    });

    it('returns policies regardless of active state', async () => {
      const row = makeRow({ is_active: false });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('pol-001');

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findById('pol-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByLeaveType', () => {
    it('returns policies matching the given leave type', async () => {
      const rows = [
        makeRow(),
        makeRow({ id: 'pol-002', policy_name: 'Annual Leave (Exec)' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByLeaveType(LeaveType.ANNUAL);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        ['annual'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pol-001');
      expect(result[1].id).toBe('pol-002');
    });

    it('returns an empty array when no policies match the leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveType(LeaveType.SICK);

      expect(result).toEqual([]);
    });

    it('returns policies regardless of active state', async () => {
      const rows = [
        makeRow({ is_active: true }),
        makeRow({ id: 'pol-002', is_active: false }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByLeaveType(LeaveType.ANNUAL);

      expect(result).toHaveLength(2);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findByLeaveType(LeaveType.ANNUAL, client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findAllActive', () => {
    it('returns only active policies', async () => {
      const rows = [
        makeRow(),
        makeRow({ id: 'pol-002', policy_name: 'Sick Leave', leave_type: 'sick' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findAllActive();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true',
      );
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.isActive)).toBe(true);
    });

    it('returns an empty array when no active policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAllActive();

      expect(result).toEqual([]);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findAllActive(client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('rowToLeavePolicy (via findById)', () => {
    it('preserves null for nullable fields', async () => {
      const row = makeRow({
        accrual_rate: null,
        max_accumulation: null,
        minimum_notice_days: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('pol-001');

      expect(result!.accrualRate).toBeNull();
      expect(result!.maxAccumulation).toBeNull();
      expect(result!.minimumNoticeDays).toBeNull();
    });

    it('casts leave_type to LeaveType enum', async () => {
      const row = makeRow({ leave_type: 'emergency' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('pol-001');

      expect(result!.leaveType).toBe(LeaveType.EMERGENCY);
    });

    it('converts date strings to Date objects', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('pol-001');

      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });
  });
});
