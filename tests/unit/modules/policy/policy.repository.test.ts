import { PolicyRepository } from 'modules/policy/policy.repository';
import { pool } from 'shared/db/connection';
import { LeaveType } from 'shared/types';

jest.mock('shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-15T12:00:00.000Z',
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
    it('should return a LeavePolicy when the row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const result = await repo.findById('pol-1');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM leave_policies WHERE id = $1', ['pol-1']);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('pol-1');
      expect(result!.policyName).toBe('Annual Leave');
      expect(result!.leaveType).toBe(LeaveType.ANNUAL);
      expect(result!.entitlementDays).toBe(20);
      expect(result!.accrualRate).toBeNull();
      expect(result!.maxAccumulation).toBeNull();
      expect(result!.minimumNoticeDays).toBe(7);
      expect(result!.requiresManagerApproval).toBe(true);
      expect(result!.isActive).toBe(true);
      expect(result!.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(result!.updatedAt).toEqual(new Date('2026-06-15T12:00:00.000Z'));
    });

    it('should return null when no row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle null numeric fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ accrual_rate: null, max_accumulation: null, minimum_notice_days: null })],
      });

      const result = await repo.findById('pol-1');

      expect(result!.accrualRate).toBeNull();
      expect(result!.maxAccumulation).toBeNull();
      expect(result!.minimumNoticeDays).toBeNull();
    });
  });

  describe('findByLeaveType', () => {
    it('should return policies for the given leave type', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow(), makeRow({ id: 'pol-2', leave_type: 'annual', policy_name: 'Annual Leave v2' })],
      });

      const results = await repo.findByLeaveType(LeaveType.ANNUAL);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        ['annual'],
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('pol-1');
      expect(results[1].id).toBe('pol-2');
      expect(results[0].leaveType).toBe(LeaveType.ANNUAL);
      expect(results[1].leaveType).toBe(LeaveType.ANNUAL);
    });

    it('should return an empty array when no policies match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findByLeaveType(LeaveType.SICK);

      expect(results).toHaveLength(0);
    });
  });

  describe('findActive', () => {
    it('should return only active policies', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({ id: 'pol-1', is_active: true }),
          makeRow({ id: 'pol-2', is_active: true, leave_type: 'sick', policy_name: 'Sick Leave' }),
        ],
      });

      const results = await repo.findActive();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true',
      );
      expect(results).toHaveLength(2);
      expect(results[0].isActive).toBe(true);
      expect(results[1].isActive).toBe(true);
    });

    it('should return an empty array when no active policies exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findActive();

      expect(results).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should insert a new policy and return it', async () => {
      const input = {
        policyName: 'Sick Leave',
        leaveType: LeaveType.SICK,
        entitlementDays: 10,
        accrualRate: 0.5,
        maxAccumulation: 30,
        minimumNoticeDays: null,
        requiresManagerApproval: false,
        isActive: true,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'pol-new',
            policy_name: 'Sick Leave',
            leave_type: 'sick',
            entitlement_days: 10,
            accrual_rate: 0.5,
            max_accumulation: 30,
            minimum_notice_days: null,
            requires_manager_approval: false,
            is_active: true,
            created_at: '2026-08-01T00:00:00.000Z',
            updated_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        `INSERT INTO leave_policies (policy_name, leave_type, entitlement_days, accrual_rate, max_accumulation, minimum_notice_days, requires_manager_approval, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
        ['Sick Leave', 'sick', 10, 0.5, 30, null, false, true],
      );
      expect(result.id).toBe('pol-new');
      expect(result.policyName).toBe('Sick Leave');
      expect(result.leaveType).toBe(LeaveType.SICK);
      expect(result.entitlementDays).toBe(10);
      expect(result.accrualRate).toBe(0.5);
      expect(result.maxAccumulation).toBe(30);
      expect(result.minimumNoticeDays).toBeNull();
      expect(result.requiresManagerApproval).toBe(false);
      expect(result.isActive).toBe(true);
    });
  });

  describe('update', () => {
    it('should update specified fields and return the updated policy', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          makeRow({
            policy_name: 'Updated Annual Leave',
            entitlement_days: 25,
            updated_at: '2026-08-01T00:00:00.000Z',
          }),
        ],
      });

      const result = await repo.update('pol-1', {
        policyName: 'Updated Annual Leave',
        entitlementDays: 25,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_policies SET policy_name = $1, entitlement_days = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        ['Updated Annual Leave', 25, 'pol-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.policyName).toBe('Updated Annual Leave');
      expect(result!.entitlementDays).toBe(25);
    });

    it('should return null when policy does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { policyName: 'X' });

      expect(result).toBeNull();
    });

    it('should return the existing policy when no fields are provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeRow()] });

      const result = await repo.update('pol-1', {});

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM leave_policies WHERE id = $1', ['pol-1']);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('pol-1');
    });

    it('should handle updating nullable fields to null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ accrual_rate: null, max_accumulation: null })],
      });

      const result = await repo.update('pol-1', { accrualRate: null, maxAccumulation: null });

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_policies SET accrual_rate = $1, max_accumulation = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [null, null, 'pol-1'],
      );
      expect(result!.accrualRate).toBeNull();
      expect(result!.maxAccumulation).toBeNull();
    });

    it('should handle updating isActive to false', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [makeRow({ is_active: false })],
      });

      const result = await repo.update('pol-1', { isActive: false });

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE leave_policies SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [false, 'pol-1'],
      );
      expect(result!.isActive).toBe(false);
    });
  });
});
