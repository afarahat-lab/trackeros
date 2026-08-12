import { LeavePolicyRepository, LeavePolicy } from '../../../../src/modules/policy';
import { LeaveType } from '../../../../src/shared/types';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function mockQueryResult<T>(rows: T[]): { rows: T[] } {
  return { rows };
}

describe('LeavePolicyRepository', () => {
  let repository: LeavePolicyRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new LeavePolicyRepository();
  });

  describe('findById', () => {
    it('should return LeavePolicy when a row matches the id', async () => {
      const mockRow = {
        id: 'pol-1',
        policy_name: 'Annual Leave',
        leave_type: 'annual',
        entitlement_days: 20,
        accrual_rate: null,
        max_accumulation: null,
        minimum_notice_days: 7,
        requires_manager_approval: true,
        is_active: true,
        is_paid: true,
        created_at: new Date('2024-01-01T08:00:00Z'),
        updated_at: new Date('2024-01-01T08:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce(mockQueryResult([mockRow]));

      const result = await repository.findById('pol-1');

      expect(result).not.toBeNull();
      expect(result).toEqual<LeavePolicy>({
        id: 'pol-1',
        policyName: 'Annual Leave',
        leaveType: LeaveType.ANNUAL,
        entitlementDays: 20,
        accrualRate: null,
        maxAccumulation: null,
        minimumNoticeDays: 7,
        requiresManagerApproval: true,
        isActive: true,
        isPaid: true,
        createdAt: mockRow.created_at,
        updatedAt: mockRow.updated_at,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE id = $1',
        ['pol-1'],
      );
    });

    it('should return null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce(mockQueryResult([]));

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByLeaveType', () => {
    it('should return LeavePolicy when a policy exists for the given LeaveType', async () => {
      const mockRow = {
        id: 'pol-2',
        policy_name: 'Sick Leave',
        leave_type: 'sick',
        entitlement_days: 10,
        accrual_rate: 1.25,
        max_accumulation: 30,
        minimum_notice_days: 0,
        requires_manager_approval: false,
        is_active: true,
        is_paid: true,
        created_at: new Date('2024-01-01T08:00:00Z'),
        updated_at: new Date('2024-01-01T08:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce(mockQueryResult([mockRow]));

      const result = await repository.findByLeaveType(LeaveType.SICK);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('pol-2');
      expect(result!.leaveType).toBe(LeaveType.SICK);
      expect(result!.accrualRate).toBe(1.25);
      expect(result!.maxAccumulation).toBe(30);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE leave_type = $1',
        [LeaveType.SICK],
      );
    });

    it('should return null when no policy exists for the given LeaveType', async () => {
      mockQuery.mockResolvedValueOnce(mockQueryResult([]));

      const result = await repository.findByLeaveType(LeaveType.EMERGENCY);

      expect(result).toBeNull();
    });
  });

  describe('findAllActive', () => {
    it('should return all active policies', async () => {
      const mockRows = [
        {
          id: 'pol-1',
          policy_name: 'Annual Leave',
          leave_type: 'annual',
          entitlement_days: 20,
          accrual_rate: null,
          max_accumulation: null,
          minimum_notice_days: 7,
          requires_manager_approval: true,
          is_active: true,
          is_paid: true,
          created_at: new Date('2024-01-01T08:00:00Z'),
          updated_at: new Date('2024-01-01T08:00:00Z'),
        },
        {
          id: 'pol-2',
          policy_name: 'Sick Leave',
          leave_type: 'sick',
          entitlement_days: 10,
          accrual_rate: 1.25,
          max_accumulation: 30,
          minimum_notice_days: 0,
          requires_manager_approval: false,
          is_active: true,
          is_paid: true,
          created_at: new Date('2024-01-01T08:00:00Z'),
          updated_at: new Date('2024-01-01T08:00:00Z'),
        },
      ];

      mockQuery.mockResolvedValueOnce(mockQueryResult(mockRows));

      const result = await repository.findAllActive();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pol-1');
      expect(result[1].id).toBe('pol-2');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_policies WHERE is_active = true',
      );
    });

    it('should return empty array when no active policies exist', async () => {
      mockQuery.mockResolvedValueOnce(mockQueryResult([]));

      const result = await repository.findAllActive();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create and return a new policy with system-generated fields', async () => {
      const input: Omit<LeavePolicy, 'id' | 'createdAt' | 'updatedAt'> = {
        policyName: 'Emergency Leave',
        leaveType: LeaveType.EMERGENCY,
        entitlementDays: 5,
        accrualRate: null,
        maxAccumulation: null,
        minimumNoticeDays: 0,
        requiresManagerApproval: false,
        isActive: true,
        isPaid: false,
      };

      const insertedRow = {
        id: 'generated-id',
        policy_name: 'Emergency Leave',
        leave_type: 'emergency',
        entitlement_days: 5,
        accrual_rate: null,
        max_accumulation: null,
        minimum_notice_days: 0,
        requires_manager_approval: false,
        is_active: true,
        is_paid: false,
        created_at: new Date('2024-06-01T12:00:00Z'),
        updated_at: new Date('2024-06-01T12:00:00Z'),
      };

      // First call: INSERT (no rows returned), second call: SELECT
      mockQuery
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([insertedRow]));

      const result = await repository.create(input);

      expect(result.id).toBe('generated-id');
      expect(result.policyName).toBe('Emergency Leave');
      expect(result.leaveType).toBe(LeaveType.EMERGENCY);
      expect(result.entitlementDays).toBe(5);
      expect(result.accrualRate).toBeNull();
      expect(result.maxAccumulation).toBeNull();
      expect(result.isPaid).toBe(false);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Verify the INSERT was called with parameterized query
      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO leave_policies');
      expect(insertCall[1]).toHaveLength(12);
      expect(insertCall[1][2]).toBe(LeaveType.EMERGENCY);
      expect(insertCall[1][3]).toBe(5);

      // Verify the SELECT re-reads the inserted row using the same generated id
      const insertCallArgs = mockQuery.mock.calls[0][1] as unknown[];
      const generatedId = insertCallArgs[0] as string;
      const selectCall = mockQuery.mock.calls[1];
      expect(selectCall[0]).toBe('SELECT * FROM leave_policies WHERE id = $1');
      expect(selectCall[1]).toEqual([generatedId]);
    });
  });
});
