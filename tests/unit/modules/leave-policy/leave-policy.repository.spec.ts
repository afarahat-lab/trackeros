import { LeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { pool } from '../../../../src/shared/db/connection';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'lp-1',
    policy_name: 'Annual Leave Policy',
    leave_type_id: 'lt-annual',
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

describe('LeavePolicyRepository', () => {
  let repo: LeavePolicyRepository;

  beforeEach(() => {
    repo = new LeavePolicyRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return a leave policy when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lp-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lp-1');
      expect(result!.policyName).toBe('Annual Leave Policy');
      expect(result!.leaveTypeId).toBe('lt-annual');
      expect(result!.entitlementDays).toBe(20);
      expect(result!.accrualRate).toBeUndefined();
      expect(result!.maxAccumulation).toBeUndefined();
      expect(result!.minimumNoticeDays).toBe(7);
      expect(result!.requiresManagerApproval).toBe(true);
      expect(result!.isActive).toBe(true);
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['lp-1'],
      );
    });

    it('should return null when leave policy not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findById('lp-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findByLeaveTypeId', () => {
    it('should return policies for a given leave type', async () => {
      const row1 = makeRow({ id: 'lp-1', policy_name: 'Policy A' });
      const row2 = makeRow({ id: 'lp-2', policy_name: 'Policy B' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findByLeaveTypeId('lt-annual');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lp-1');
      expect(result[1].id).toBe('lp-2');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type_id = $1',
        ['lt-annual'],
      );
    });

    it('should return an empty array when no policies exist for the leave type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveTypeId('lt-empty');

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findByLeaveTypeId('lt-annual')).rejects.toThrow('db error');
    });
  });

  describe('findActiveByLeaveTypeId', () => {
    it('should return the single active policy for the leave type', async () => {
      const row = makeRow({ is_active: true });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findActiveByLeaveTypeId('lt-annual');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lp-1');
      expect(result!.isActive).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type_id = $1 AND is_active = true',
        ['lt-annual'],
      );
    });

    it('should return null when no active policy exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findActiveByLeaveTypeId('lt-annual');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findActiveByLeaveTypeId('lt-annual')).rejects.toThrow('db error');
    });
  });

  describe('findAll', () => {
    it('should return all leave policies', async () => {
      const row1 = makeRow({ id: 'lp-1' });
      const row2 = makeRow({ id: 'lp-2' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM leave_policies');
    });

    it('should return an empty array when the table is empty', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.findAll()).rejects.toThrow('db error');
    });
  });

  describe('create', () => {
    const createInput = {
      policyName: 'Sick Leave Policy',
      leaveTypeId: 'lt-sick',
      entitlementDays: 10,
      accrualRate: undefined,
      maxAccumulation: undefined,
      minimumNoticeDays: 1,
      requiresManagerApproval: false,
      isActive: true,
    };

    it('should create and return a fully-populated leave policy', async () => {
      const returnedRow = makeRow({
        id: 'lp-new',
        policy_name: 'Sick Leave Policy',
        leave_type_id: 'lt-sick',
        entitlement_days: 10,
        accrual_rate: null,
        max_accumulation: null,
        minimum_notice_days: 1,
        requires_manager_approval: false,
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(createInput);

      expect(result.id).toBe('lp-new');
      expect(result.policyName).toBe('Sick Leave Policy');
      expect(result.leaveTypeId).toBe('lt-sick');
      expect(result.entitlementDays).toBe(10);
      expect(result.accrualRate).toBeUndefined();
      expect(result.maxAccumulation).toBeUndefined();
      expect(result.minimumNoticeDays).toBe(1);
      expect(result.requiresManagerApproval).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should propagate unique-constraint violations', async () => {
      const uniqueError = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(uniqueError);

      await expect(repo.create(createInput)).rejects.toThrow('duplicate key value violates unique constraint');
    });

    it('should propagate general database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.create(createInput)).rejects.toThrow('db error');
    });
  });

  describe('update', () => {
    it('should update only provided fields and return the updated policy', async () => {
      const updatedRow = makeRow({
        policy_name: 'Updated Policy',
        entitlement_days: 25,
        updated_at: '2024-02-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('lp-1', {
        policyName: 'Updated Policy',
        entitlementDays: 25,
      });

      expect(result).not.toBeNull();
      expect(result!.policyName).toBe('Updated Policy');
      expect(result!.entitlementDays).toBe(25);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        expect.arrayContaining(['lp-1', 'Updated Policy', 25]),
      );
    });

    it('should return null when no matching row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { policyName: 'New Name' });

      expect(result).toBeNull();
    });

    it('should not allow updating id or createdAt', async () => {
      const updatedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await repo.update('lp-1', {
        id: 'hacked-id',
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date('2020-01-01'),
        policyName: 'Legit',
      });

      const sqlArg = mockQuery.mock.calls[0][0] as string;
      const setClause = sqlArg.match(/SET (.+?) WHERE/s)?.[1] ?? '';
      expect(setClause).not.toContain('id =');
      expect(setClause).not.toContain('created_at');
      expect(setClause).toContain('policy_name');
      expect(setClause).toContain('updated_at = NOW()');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repo.update('lp-1', { policyName: 'New Name' })).rejects.toThrow('db error');
    });
  });
});
