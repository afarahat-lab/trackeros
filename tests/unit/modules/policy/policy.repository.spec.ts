import { LeaveType } from '../../../../src/shared/types';
import { LeavePolicyRepository } from '../../../../src/modules/policy/policy.repository';
import {
  PolicyNotFoundError,
  UniqueConstraintError,
} from '../../../../src/modules/policy/policy.errors';
import type { CreateLeavePolicyInput } from '../../../../src/modules/policy/policy.model';

const poolQuery = jest.fn();

jest.mock('../../../../src/shared/db', () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));

interface Row {
  [key: string]: unknown;
}

interface FakeQueryResult {
  rows: Row[];
}

interface FakeClient {
  query: jest.Mock<Promise<FakeQueryResult>, [string, unknown[]]>;
}

describe('LeavePolicyRepository', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  let repo: LeavePolicyRepository;

  beforeEach(() => {
    poolQuery.mockReset();
    repo = new LeavePolicyRepository();
  });

  function mockReturn(rows: Row[]): void {
    poolQuery.mockResolvedValueOnce({ rows });
  }

  function toRow(input: CreateLeavePolicyInput, id = 'pol-1'): Row {
    return {
      id,
      policy_name: input.policyName,
      leave_type: input.leaveType,
      entitlement_days: input.entitlementDays,
      accrual_rate: input.accrualRate ?? null,
      max_accumulation: input.maxAccumulation ?? null,
      minimum_notice_days: input.minimumNoticeDays ?? null,
      requires_manager_approval: input.requiresManagerApproval ?? false,
      is_active: input.isActive ?? true,
      created_at: now,
      updated_at: now,
    };
  }

  function expectedMapper(input: CreateLeavePolicyInput, id = 'pol-1'): Row {
    return {
      id,
      policyName: input.policyName,
      leaveType: input.leaveType,
      entitlementDays: input.entitlementDays,
      accrualRate: input.accrualRate ?? undefined,
      maxAccumulation: input.maxAccumulation ?? undefined,
      minimumNoticeDays: input.minimumNoticeDays ?? undefined,
      requiresManagerApproval: input.requiresManagerApproval ?? false,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
  }

  describe('create', () => {
    it('persists a policy and returns the mapped LeavePolicy', async () => {
      const input: CreateLeavePolicyInput = {
        policyName: 'Annual Leave',
        leaveType: LeaveType.annual,
        entitlementDays: 20,
        accrualRate: 1.67,
        maxAccumulation: 40,
        minimumNoticeDays: 3,
        requiresManagerApproval: true,
        isActive: true,
      };

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result).toEqual(expectedMapper(input));
      expect(poolQuery).toHaveBeenCalledTimes(1);
      expect(poolQuery.mock.calls[0][0]).toContain('INSERT INTO leave_policies');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[1]).toBe('Annual Leave');
      expect(params[2]).toBe(LeaveType.annual);
      expect(params[3]).toBe(20);
      expect(params[4]).toBe(1.67);
      expect(params[5]).toBe(40);
      expect(params[6]).toBe(3);
      expect(params[7]).toBe(true);
      expect(params[8]).toBe(true);
    });

    it('defaults requiresManagerApproval to false, isActive to true and maps optional numbers to NULL', async () => {
      const input: CreateLeavePolicyInput = {
        policyName: 'Sick Leave',
        leaveType: LeaveType.sick,
        entitlementDays: 10,
      };

      mockReturn([toRow(input)]);

      const result = await repo.create(input);

      expect(result.requiresManagerApproval).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.accrualRate).toBeUndefined();
      expect(result.maxAccumulation).toBeUndefined();
      expect(result.minimumNoticeDays).toBeUndefined();

      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[4]).toBeNull();
      expect(params[5]).toBeNull();
      expect(params[6]).toBeNull();
      expect(params[7]).toBe(false);
      expect(params[8]).toBe(true);
    });

    it('throws a UniqueConstraintError on a 23505 violation', async () => {
      const input: CreateLeavePolicyInput = {
        policyName: 'Annual Leave',
        leaveType: LeaveType.annual,
        entitlementDays: 20,
      };
      const err = Object.assign(new Error('duplicate key'), { code: '23505' });
      poolQuery.mockRejectedValueOnce(err);

      await expect(repo.create(input)).rejects.toMatchObject({ code: 'DUPLICATE_POLICY' });
    });

    it('joins a caller transaction when a PoolClient is supplied', async () => {
      const client: FakeClient = { query: jest.fn() };
      const input: CreateLeavePolicyInput = {
        policyName: 'Maternity Leave',
        leaveType: LeaveType.maternity,
        entitlementDays: 90,
      };

      client.query.mockResolvedValueOnce({ rows: [toRow(input, 'pol-2')] });

      await repo.create(input, (client as unknown) as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(poolQuery).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns null when no matching row exists', async () => {
      mockReturn([]);
      await expect(repo.findById('pol-unknown')).resolves.toBeNull();
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['pol-unknown']
      );
    });

    it('maps an existing row to a LeavePolicy', async () => {
      const input: CreateLeavePolicyInput = {
        policyName: 'Annual Leave',
        leaveType: LeaveType.annual,
        entitlementDays: 20,
      };
      mockReturn([toRow(input)]);

      const result = await repo.findById('pol-1');
      expect(result).toEqual(expectedMapper(input));
    });
  });

  describe('findByLeaveType', () => {
    it('returns an empty list when none exist', async () => {
      mockReturn([]);
      await expect(repo.findByLeaveType(LeaveType.unpaid)).resolves.toEqual([]);
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE leave_type = $1'),
        [LeaveType.unpaid]
      );
    });

    it('returns all mapped policies for a leave type', async () => {
      const first: CreateLeavePolicyInput = {
        policyName: 'Annual Leave',
        leaveType: LeaveType.annual,
        entitlementDays: 20,
      };
      const second: CreateLeavePolicyInput = {
        policyName: 'Annual Leave (senior)',
        leaveType: LeaveType.annual,
        entitlementDays: 25,
      };
      mockReturn([toRow(first, 'pol-a'), toRow(second, 'pol-b')]);

      const result = await repo.findByLeaveType(LeaveType.annual);
      expect(result.map((r) => r.id)).toEqual(['pol-a', 'pol-b']);
      expect(result.map((r) => r.leaveType)).toEqual([LeaveType.annual, LeaveType.annual]);
    });
  });

  describe('findActive', () => {
    it('returns an empty list when none are active', async () => {
      mockReturn([]);
      await expect(repo.findActive()).resolves.toEqual([]);
      expect(poolQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = TRUE')
      );
    });

    it('returns only active policies', async () => {
      const input: CreateLeavePolicyInput = {
        policyName: 'Annual Leave',
        leaveType: LeaveType.annual,
        entitlementDays: 20,
        isActive: true,
      };
      mockReturn([toRow(input)]);

      const result = await repo.findActive();
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('update', () => {
    it('updates only the supplied fields and returns the updated policy', async () => {
      const input: CreateLeavePolicyInput = {
        policyName: 'Annual Leave',
        leaveType: LeaveType.annual,
        entitlementDays: 20,
        maxAccumulation: 45,
      };
      mockReturn([toRow(input)]);

      const result = await repo.update('pol-1', { maxAccumulation: 45 });

      expect(result.maxAccumulation).toBe(45);
      const sql = poolQuery.mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE leave_policies');
      expect(sql).toContain('max_accumulation = $3');
      expect(sql).not.toContain('policy_name =');
      const params = poolQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('pol-1');
      expect(params[2]).toBe(45);
    });

    it('throws PolicyNotFoundError when the target row is missing', async () => {
      mockReturn([]);
      await expect(repo.update('pol-missing', { isActive: false })).rejects.toBeInstanceOf(
        PolicyNotFoundError
      );
    });

    it('throws a UniqueConstraintError on a 23505 violation', async () => {
      const err = Object.assign(new Error('duplicate key'), { code: '23505' });
      poolQuery.mockRejectedValueOnce(err);

      await expect(repo.update('pol-1', { policyName: 'Dup' })).rejects.toMatchObject({
        code: 'DUPLICATE_POLICY',
      });
    });
  });
});
