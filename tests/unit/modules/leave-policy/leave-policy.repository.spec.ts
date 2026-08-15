import { LeavePolicyRepository, ILeavePolicyRepository, LeavePolicy } from '../../../../src/modules/leave-policy';
import { LeaveType } from '../../../../src/shared/types';

// Mock the shared db pool
jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {},
}));

// Mock knex
const mockRaw = jest.fn();
jest.mock('knex', () => {
  return jest.fn(() => ({
    raw: mockRaw,
  }));
});

function makeLeavePolicyRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'pol-1',
    policy_name: 'Annual Leave',
    leave_type: 'annual',
    entitlement_days: 20,
    accrual_rate: null,
    max_accumulation: 30,
    minimum_notice_days: 7,
    requires_manager_approval: true,
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function expectLeavePolicy(result: LeavePolicy | null, expected: Record<string, unknown>): void {
  expect(result).not.toBeNull();
  if (result === null) return;
  expect(result.id).toBe(expected.id);
  expect(result.policyName).toBe(expected.policy_name);
  expect(result.leaveType).toBe(expected.leave_type);
  expect(result.entitlementDays).toBe(expected.entitlement_days);
  expect(result.accrualRate).toBe(expected.accrual_rate ?? null);
  expect(result.maxAccumulation).toBe(expected.max_accumulation ?? null);
  expect(result.minimumNoticeDays).toBe(expected.minimum_notice_days ?? null);
  expect(result.requiresManagerApproval).toBe(expected.requires_manager_approval);
  expect(result.isActive).toBe(expected.is_active);
  expect(result.createdAt).toEqual(expected.created_at);
  expect(result.updatedAt).toEqual(expected.updated_at);
}

describe('LeavePolicyRepository', () => {
  let repo: ILeavePolicyRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new LeavePolicyRepository();
  });

  describe('findById', () => {
    it('should return a policy when found', async () => {
      const row = makeLeavePolicyRow();
      mockRaw.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('pol-1');

      expect(mockRaw).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = ?',
        ['pol-1'],
      );
      expectLeavePolicy(result, row);
    });

    it('should return null when not found', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByLeaveType', () => {
    it('should return a policy when found', async () => {
      const row = makeLeavePolicyRow({ leave_type: 'sick' });
      mockRaw.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByLeaveType(LeaveType.SICK);

      expect(mockRaw).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = ?',
        ['sick'],
      );
      expectLeavePolicy(result, row);
    });

    it('should return null when not found', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveType(LeaveType.UNPAID);

      expect(result).toBeNull();
    });
  });

  describe('findAllActive', () => {
    it('should return only active policies', async () => {
      const row1 = makeLeavePolicyRow();
      const row2 = makeLeavePolicyRow({ id: 'pol-2', policy_name: 'Sick Leave', leave_type: 'sick' });
      mockRaw.mockResolvedValueOnce({ rows: [row1, row2] });

      const results = await repo.findAllActive();

      expect(mockRaw).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true',
      );
      expect(results).toHaveLength(2);
      expectLeavePolicy(results[0], row1);
      expectLeavePolicy(results[1], row2);
    });

    it('should return empty array when no active policies', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findAllActive();

      expect(results).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all policies', async () => {
      const row1 = makeLeavePolicyRow();
      const row2 = makeLeavePolicyRow({ id: 'pol-2', is_active: false });
      mockRaw.mockResolvedValueOnce({ rows: [row1, row2] });

      const results = await repo.findAll();

      expect(mockRaw).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies',
      );
      expect(results).toHaveLength(2);
      expectLeavePolicy(results[0], row1);
      expectLeavePolicy(results[1], row2);
    });

    it('should return empty array when no policies', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] });

      const results = await repo.findAll();

      expect(results).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new policy', async () => {
      const input: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'> = {
        policyName: 'Annual Leave',
        leaveType: LeaveType.ANNUAL,
        entitlementDays: 20,
        accrualRate: null,
        maxAccumulation: 30,
        minimumNoticeDays: 7,
        requiresManagerApproval: true,
        isActive: true,
      };

      const row = makeLeavePolicyRow();
      mockRaw.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockRaw).toHaveBeenCalledTimes(1);
      const [sql, params] = mockRaw.mock.calls[0];
      expect(sql).toContain('INSERT INTO leave_policies');
      expect(params[0]).toBe('Annual Leave');
      expect(params[1]).toBe('annual');
      expect(params[2]).toBe(20);
      expect(params[3]).toBeNull();
      expect(params[4]).toBe(30);
      expect(params[5]).toBe(7);
      expect(params[6]).toBe(true);
      expect(params[7]).toBe(true);
      expectLeavePolicy(result, row);
    });
  });

  describe('update', () => {
    it('should update and return the policy', async () => {
      const existingRow = makeLeavePolicyRow();
      mockRaw.mockResolvedValueOnce({ rows: [existingRow] }); // findById

      const updatedRow = makeLeavePolicyRow({ policy_name: 'Updated Annual', updated_at: new Date() });
      mockRaw.mockResolvedValueOnce({ rows: [updatedRow] }); // update

      const result = await repo.update('pol-1', { policyName: 'Updated Annual' });

      expect(mockRaw).toHaveBeenCalledTimes(2);
      expectLeavePolicy(result, updatedRow);
    });

    it('should return null when policy does not exist', async () => {
      mockRaw.mockResolvedValueOnce({ rows: [] }); // findById returns null

      const result = await repo.update('nonexistent', { policyName: 'Updated' });

      expect(result).toBeNull();
      expect(mockRaw).toHaveBeenCalledTimes(1);
    });

    it('should return existing policy when no fields to update', async () => {
      const existingRow = makeLeavePolicyRow();
      mockRaw.mockResolvedValueOnce({ rows: [existingRow] }); // findById

      const result = await repo.update('pol-1', {});

      expect(mockRaw).toHaveBeenCalledTimes(1);
      expectLeavePolicy(result, existingRow);
    });

    it('should update isActive field', async () => {
      const existingRow = makeLeavePolicyRow();
      mockRaw.mockResolvedValueOnce({ rows: [existingRow] }); // findById

      const updatedRow = makeLeavePolicyRow({ is_active: false, updated_at: new Date() });
      mockRaw.mockResolvedValueOnce({ rows: [updatedRow] }); // update

      const result = await repo.update('pol-1', { isActive: false });

      expect(mockRaw).toHaveBeenCalledTimes(2);
      expectLeavePolicy(result, updatedRow);
    });
  });
});
