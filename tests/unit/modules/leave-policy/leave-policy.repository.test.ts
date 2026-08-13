import { LeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { Pool } from 'pg';

jest.mock('../../../../src/shared/db/connection', () => {
  const mockPool = {
    query: jest.fn(),
  };
  return { pool: mockPool as unknown as Pool };
});

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<{
  id: string;
  policy_name: string;
  leave_type_id: string;
  entitlement_days: number;
  accrual_rate: number | null;
  max_accumulation: number | null;
  minimum_notice_days: number | null;
  requires_manager_approval: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'lp-1',
    policy_name: overrides.policy_name ?? 'Standard Annual Policy',
    leave_type_id: overrides.leave_type_id ?? 'lt-1',
    entitlement_days: overrides.entitlement_days ?? 20,
    accrual_rate: overrides.accrual_rate ?? null,
    max_accumulation: overrides.max_accumulation ?? null,
    minimum_notice_days: overrides.minimum_notice_days ?? null,
    requires_manager_approval: overrides.requires_manager_approval ?? true,
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? new Date('2025-01-01T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2025-01-01T00:00:00Z'),
  };
}

const COLUMNS = [
  'id',
  'policy_name',
  'leave_type_id',
  'entitlement_days',
  'accrual_rate',
  'max_accumulation',
  'minimum_notice_days',
  'requires_manager_approval',
  'is_active',
  'created_at',
  'updated_at',
].join(', ');

describe('LeavePolicyRepository', () => {
  let repo: LeavePolicyRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    repo = new LeavePolicyRepository();
  });

  describe('findAll', () => {
    it('should return all leave policies ordered by policy_name', async () => {
      const rows = [
        makeRow({ id: 'lp-1', policy_name: 'Annual Policy' }),
        makeRow({ id: 'lp-2', policy_name: 'Sick Policy', leave_type_id: 'lt-2' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findAll();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_policies ORDER BY policy_name ASC`,
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lp-1');
      expect(result[0].policyName).toBe('Annual Policy');
      expect(result[0].leaveTypeId).toBe('lt-1');
      expect(result[0].entitlementDays).toBe(20);
      expect(result[0].accrualRate).toBeUndefined();
      expect(result[0].maxAccumulation).toBeUndefined();
      expect(result[0].minimumNoticeDays).toBeUndefined();
      expect(result[0].requiresManagerApproval).toBe(true);
      expect(result[0].isActive).toBe(true);
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should return empty array when no leave policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a leave policy when found', async () => {
      const row = makeRow({
        id: 'lp-1',
        policy_name: 'Emergency Policy',
        leave_type_id: 'lt-3',
        entitlement_days: 5,
        accrual_rate: 5,
        max_accumulation: 5,
        minimum_notice_days: 0,
        requires_manager_approval: true,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_policies WHERE id = $1`,
        ['lp-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('lp-1');
      expect(result!.policyName).toBe('Emergency Policy');
      expect(result!.accrualRate).toBe(5);
      expect(result!.maxAccumulation).toBe(5);
      expect(result!.minimumNoticeDays).toBe(0);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByLeaveTypeId', () => {
    it('should return all policies for a given leave type', async () => {
      const rows = [
        makeRow({ id: 'lp-1', policy_name: 'Policy A', leave_type_id: 'lt-1' }),
        makeRow({ id: 'lp-2', policy_name: 'Policy B', leave_type_id: 'lt-1' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByLeaveTypeId('lt-1');

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_policies WHERE leave_type_id = $1 ORDER BY policy_name ASC`,
        ['lt-1'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].leaveTypeId).toBe('lt-1');
      expect(result[1].leaveTypeId).toBe('lt-1');
    });

    it('should return empty array when no policies match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveTypeId('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findActiveByLeaveTypeId', () => {
    it('should return only active policies for a given leave type', async () => {
      const rows = [
        makeRow({ id: 'lp-1', policy_name: 'Active Policy', leave_type_id: 'lt-1', is_active: true }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findActiveByLeaveTypeId('lt-1');

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_policies WHERE leave_type_id = $1 AND is_active = true ORDER BY policy_name ASC`,
        ['lt-1'],
      );
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('should return empty array when no active policies match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findActiveByLeaveTypeId('lt-1');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert a new leave policy and return it', async () => {
      const row = makeRow({
        id: 'lp-new',
        policy_name: 'Maternity Policy',
        leave_type_id: 'lt-4',
        entitlement_days: 90,
        accrual_rate: 90,
        max_accumulation: 90,
        minimum_notice_days: 30,
        requires_manager_approval: true,
        is_active: true,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        policyName: 'Maternity Policy',
        leaveTypeId: 'lt-4',
        entitlementDays: 90,
        accrualRate: 90,
        maxAccumulation: 90,
        minimumNoticeDays: 30,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        ['Maternity Policy', 'lt-4', 90, 90, 90, 30, true, true],
      );
      expect(result.id).toBe('lp-new');
      expect(result.policyName).toBe('Maternity Policy');
      expect(result.entitlementDays).toBe(90);
      expect(result.accrualRate).toBe(90);
      expect(result.maxAccumulation).toBe(90);
      expect(result.minimumNoticeDays).toBe(30);
      expect(result.requiresManagerApproval).toBe(true);
      expect(result.isActive).toBe(true);
    });

    it('should default requiresManagerApproval and isActive to true when not provided', async () => {
      const row = makeRow({
        id: 'lp-new2',
        policy_name: 'Simple Policy',
        leave_type_id: 'lt-1',
        entitlement_days: 10,
        requires_manager_approval: true,
        is_active: true,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        policyName: 'Simple Policy',
        leaveTypeId: 'lt-1',
        entitlementDays: 10,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        ['Simple Policy', 'lt-1', 10, null, null, null, true, true],
      );
      expect(result.requiresManagerApproval).toBe(true);
      expect(result.isActive).toBe(true);
    });

    it('should allow setting requiresManagerApproval and isActive to false', async () => {
      const row = makeRow({
        id: 'lp-no-approval',
        policy_name: 'No Approval Policy',
        leave_type_id: 'lt-1',
        entitlement_days: 5,
        requires_manager_approval: false,
        is_active: false,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        policyName: 'No Approval Policy',
        leaveTypeId: 'lt-1',
        entitlementDays: 5,
        requiresManagerApproval: false,
        isActive: false,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        ['No Approval Policy', 'lt-1', 5, null, null, null, false, false],
      );
      expect(result.requiresManagerApproval).toBe(false);
      expect(result.isActive).toBe(false);
    });

    it('should handle null optional fields correctly', async () => {
      const row = makeRow({
        id: 'lp-nulls',
        policy_name: 'Nulls Policy',
        leave_type_id: 'lt-1',
        entitlement_days: 15,
        accrual_rate: null,
        max_accumulation: null,
        minimum_notice_days: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        policyName: 'Nulls Policy',
        leaveTypeId: 'lt-1',
        entitlementDays: 15,
      });

      expect(result.accrualRate).toBeUndefined();
      expect(result.maxAccumulation).toBeUndefined();
      expect(result.minimumNoticeDays).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update provided fields and return the updated leave policy', async () => {
      const row = makeRow({
        id: 'lp-1',
        policy_name: 'Updated Policy',
        leave_type_id: 'lt-2',
        entitlement_days: 25,
        accrual_rate: 25,
        max_accumulation: 50,
        minimum_notice_days: 7,
        requires_manager_approval: false,
        is_active: false,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lp-1', {
        policyName: 'Updated Policy',
        leaveTypeId: 'lt-2',
        entitlementDays: 25,
        accrualRate: 25,
        maxAccumulation: 50,
        minimumNoticeDays: 7,
        requiresManagerApproval: false,
        isActive: false,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        ['Updated Policy', 'lt-2', 25, 25, 50, 7, false, false, 'lp-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.policyName).toBe('Updated Policy');
      expect(result!.leaveTypeId).toBe('lt-2');
      expect(result!.entitlementDays).toBe(25);
      expect(result!.accrualRate).toBe(25);
      expect(result!.maxAccumulation).toBe(50);
      expect(result!.minimumNoticeDays).toBe(7);
      expect(result!.requiresManagerApproval).toBe(false);
      expect(result!.isActive).toBe(false);
    });

    it('should return null when leave policy does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { policyName: 'New Name' });

      expect(result).toBeNull();
    });

    it('should return the existing leave policy when no fields are provided', async () => {
      const row = makeRow({ id: 'lp-1' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lp-1', {});

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lp-1');
    });

    it('should update only the policyName field', async () => {
      const row = makeRow({ id: 'lp-1', policy_name: 'Only Name Changed' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lp-1', { policyName: 'Only Name Changed' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        ['Only Name Changed', 'lp-1'],
      );
      expect(result).not.toBeNull();
    });

    it('should update only the isActive field', async () => {
      const row = makeRow({ id: 'lp-1', is_active: false });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('lp-1', { isActive: false });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        [false, 'lp-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('should return true when a row is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.delete('lp-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM leave_policies WHERE id = $1',
        ['lp-1'],
      );
      expect(result).toBe(true);
    });

    it('should return false when no row is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided client instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as Pool;
      const customRepo = new LeavePolicyRepository(mockClient);
      mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      await customRepo.findAll();

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
