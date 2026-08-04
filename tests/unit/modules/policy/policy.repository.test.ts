import { PolicyRepository } from 'modules/policy/policy.repository';
import { pool } from 'shared/db/connection';
import { LeaveType } from 'shared/types/index';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pol-1',
    policy_name: 'Annual Leave',
    leave_type: 'annual',
    entitlement_days: 20,
    accrual_rate: null,
    max_accumulation: null,
    minimum_notice_days: 7,
    requires_manager_approval: true,
    is_active: true,
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-06-01T12:00:00Z'),
    ...overrides,
  };
}

function makePolicy(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.annual,
    entitlementDays: 20,
    accrualRate: null,
    maxAccumulation: null,
    minimumNoticeDays: 7,
    requiresManagerApproval: true,
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-06-01T12:00:00Z'),
    ...overrides,
  };
}

describe('PolicyRepository', () => {
  let repo: PolicyRepository;

  beforeEach(() => {
    repo = new PolicyRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('returns a policy when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('pol-1');

      expect(result).toEqual(makePolicy());
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['pol-1'],
      );
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('propagates database errors as rejected promises', async () => {
      const dbError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.findById('pol-1')).rejects.toThrow('connection refused');
    });
  });

  describe('findByLeaveType', () => {
    it('returns policies matching the leave type', async () => {
      const row1 = makeRow({ id: 'pol-1', leave_type: 'sick' });
      const row2 = makeRow({ id: 'pol-2', leave_type: 'sick', policy_name: 'Sick Leave' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findByLeaveType(LeaveType.sick);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makePolicy({ id: 'pol-1', leaveType: LeaveType.sick }));
      expect(result[1]).toEqual(makePolicy({ id: 'pol-2', leaveType: LeaveType.sick, policyName: 'Sick Leave' }));
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        ['sick'],
      );
    });

    it('returns an empty array when no policies match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveType(LeaveType.maternity);

      expect(result).toEqual([]);
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout'));

      await expect(repo.findByLeaveType(LeaveType.annual)).rejects.toThrow('timeout');
    });
  });

  describe('findAllActive', () => {
    it('returns all active policies', async () => {
      const row1 = makeRow({ id: 'pol-1' });
      const row2 = makeRow({ id: 'pol-2', policy_name: 'Sick Leave', leave_type: 'sick' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAllActive();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makePolicy());
      expect(result[1]).toEqual(makePolicy({ id: 'pol-2', policyName: 'Sick Leave', leaveType: LeaveType.sick }));
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true',
      );
    });

    it('returns an empty array when no active policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAllActive();

      expect(result).toEqual([]);
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('table not found'));

      await expect(repo.findAllActive()).rejects.toThrow('table not found');
    });
  });

  describe('create', () => {
    it('persists a new policy and returns the created entity', async () => {
      const input = {
        id: 'pol-new',
        policyName: 'Emergency Leave',
        leaveType: LeaveType.emergency,
        entitlementDays: 5,
        accrualRate: null,
        maxAccumulation: null,
        minimumNoticeDays: 0,
        requiresManagerApproval: false,
        isActive: true,
      };

      const returnedRow = makeRow({
        id: 'pol-new',
        policy_name: 'Emergency Leave',
        leave_type: 'emergency',
        entitlement_days: 5,
        accrual_rate: null,
        max_accumulation: null,
        minimum_notice_days: 0,
        requires_manager_approval: false,
        is_active: true,
      });

      mockQuery.mockResolvedValueOnce({ rows: [returnedRow] });

      const result = await repo.create(input);

      expect(result).toEqual(makePolicy({
        id: 'pol-new',
        policyName: 'Emergency Leave',
        leaveType: LeaveType.emergency,
        entitlementDays: 5,
        minimumNoticeDays: 0,
        requiresManagerApproval: false,
      }));

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_policies'),
        [
          'pol-new', 'Emergency Leave', 'emergency', 5,
          null, null, 0,
          false, true,
        ],
      );
    });

    it('propagates unique constraint violations as rejected promises', async () => {
      const dbError = new Error('duplicate key value violates unique constraint');
      mockQuery.mockRejectedValueOnce(dbError);

      const input = {
        id: 'pol-dup',
        policyName: 'Duplicate',
        leaveType: LeaveType.annual,
        entitlementDays: 20,
        accrualRate: null,
        maxAccumulation: null,
        minimumNoticeDays: 7,
        requiresManagerApproval: true,
        isActive: true,
      };

      await expect(repo.create(input)).rejects.toThrow('duplicate key value');
    });
  });

  describe('update', () => {
    it('applies only supplied mutable fields and returns the updated policy', async () => {
      const updatedRow = makeRow({
        policy_name: 'Updated Annual',
        entitlement_days: 25,
        minimum_notice_days: 14,
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.update('pol-1', {
        policyName: 'Updated Annual',
        entitlementDays: 25,
        minimumNoticeDays: 14,
      });

      expect(result).toEqual(makePolicy({
        policyName: 'Updated Annual',
        entitlementDays: 25,
        minimumNoticeDays: 14,
      }));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_policies SET'),
        ['Updated Annual', 25, 14, 'pol-1'],
      );
    });

    it('returns null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { policyName: 'X' });

      expect(result).toBeNull();
    });

    it('excludes id from the mutable field set', async () => {
      const updatedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await repo.update('pol-1', { policyName: 'NewName' });

      const sqlCall = mockQuery.mock.calls[0][0] as string;
      const setClause = sqlCall.split(' WHERE ')[0];
      expect(setClause).not.toContain('id');
    });

    it('excludes createdAt from the mutable field set', async () => {
      const updatedRow = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await repo.update('pol-1', { policyName: 'NewName' });

      const sqlCall = mockQuery.mock.calls[0][0] as string;
      const setClause = sqlCall.split(' WHERE ')[0];
      expect(setClause).not.toContain('created_at');
    });

    it('returns the existing policy when no mutable fields are supplied', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('pol-1', {});

      expect(result).toEqual(makePolicy());
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['pol-1'],
      );
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('check constraint violation'));

      await expect(repo.update('pol-1', { policyName: 'X' })).rejects.toThrow('check constraint');
    });
  });

  describe('deactivate', () => {
    it('sets is_active to false and returns true when a row is affected', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repo.deactivate('pol-1');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE leave_policies SET is_active = false, updated_at = NOW() WHERE id = $1',
        ['pol-1'],
      );
    });

    it('returns false when no row matched', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repo.deactivate('nonexistent');

      expect(result).toBe(false);
    });

    it('propagates database errors as rejected promises', async () => {
      mockQuery.mockRejectedValueOnce(new Error('permission denied'));

      await expect(repo.deactivate('pol-1')).rejects.toThrow('permission denied');
    });
  });
});
