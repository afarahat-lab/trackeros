import { PgLeavePolicyRepository } from '../../../../src/modules/leave-policy/leave-policy.repository';
import { LeavePolicy } from '../../../../src/modules/leave-policy/leave-policy.model';
import { LeaveType } from '../../../../src/shared/types';

const mockQuery = jest.fn();
jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

function makePolicyRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
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
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function expectedPolicy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
  return {
    id: 'pol-1',
    policyName: 'Annual Leave',
    leaveType: LeaveType.annual,
    entitlementDays: 20,
    accrualRate: undefined,
    maxAccumulation: undefined,
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
    it('should return a policy when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makePolicyRow()] });

      const result = await repo.findById('pol-1');

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['pol-1']);
      expect(result).toEqual(expectedPolicy());
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByLeaveType', () => {
    it('should return a policy matching the leave type', async () => {
      const row = makePolicyRow({ leave_type: 'sick', policy_name: 'Sick Leave', entitlement_days: 10 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findByLeaveType(LeaveType.sick);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('leave_type'), [LeaveType.sick]);
      expect(result).toEqual(expectedPolicy({
        policyName: 'Sick Leave',
        leaveType: LeaveType.sick,
        entitlementDays: 10,
      }));
    });

    it('should return null when no policy matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByLeaveType(LeaveType.emergency);

      expect(result).toBeNull();
    });
  });

  describe('findAllActive', () => {
    it('should return only active policies', async () => {
      const row1 = makePolicyRow();
      const row2 = makePolicyRow({ id: 'pol-2', policy_name: 'Sick Leave', leave_type: 'sick' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2] });

      const result = await repo.findAllActive();

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_active = true'));
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expectedPolicy());
      expect(result[1]).toEqual(expectedPolicy({ id: 'pol-2', policyName: 'Sick Leave', leaveType: LeaveType.sick }));
    });

    it('should return empty array when no active policies', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAllActive();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should insert and return a new policy', async () => {
      const input = {
        policyName: 'Emergency Leave',
        leaveType: LeaveType.emergency,
        entitlementDays: 5,
        accrualRate: undefined,
        maxAccumulation: undefined,
        minimumNoticeDays: 0,
        requiresManagerApproval: false,
        isActive: true,
      };

      const row = makePolicyRow({
        id: 'pol-new',
        policy_name: 'Emergency Leave',
        leave_type: 'emergency',
        entitlement_days: 5,
        minimum_notice_days: 0,
        requires_manager_approval: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO leave_policies'), [
        'Emergency Leave', 'emergency', 5, undefined, undefined, 0, false, true,
      ]);
      expect(result.id).toBe('pol-new');
      expect(result.policyName).toBe('Emergency Leave');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update and return the modified policy', async () => {
      const row = makePolicyRow({ policy_name: 'Updated Policy', entitlement_days: 25 });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.update('pol-1', { policyName: 'Updated Policy', entitlementDays: 25 });

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE leave_policies'), expect.any(Array));
      expect(result).not.toBeNull();
      expect(result!.policyName).toBe('Updated Policy');
      expect(result!.entitlementDays).toBe(25);
    });

    it('should return null when policy does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.update('nonexistent', { policyName: 'X' });

      expect(result).toBeNull();
    });
  });
});
