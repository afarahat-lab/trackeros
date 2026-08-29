jest.mock('../../../../src/shared/db/connection', () => ({
  pool: { query: jest.fn() }
}));

import { PgLeaveTypeRepository } from '../../../../src/modules/leave-type/leave-type.repository';
import { LeaveType } from '../../../../src/modules/leave-type/leave-type.model';
import { LeaveTypeCode } from '../../../../src/shared/types/enums';
import { pool } from '../../../../src/shared/db/connection';

const queryMock = (pool as unknown as { query: jest.Mock }).query;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lt-1',
    code: 'annual',
    name: 'Annual Leave',
    is_paid: true,
    requires_manager_approval: true,
    is_active: true,
    ...overrides
  };
}

function makeLeaveType(overrides: Partial<LeaveType> = {}): LeaveType {
  return {
    id: 'lt-1',
    code: LeaveTypeCode.ANNUAL,
    name: 'Annual Leave',
    isPaid: true,
    requiresManagerApproval: true,
    isActive: true,
    ...overrides
  };
}

describe('PgLeaveTypeRepository', () => {
  let repo: PgLeaveTypeRepository;

  beforeEach(() => {
    queryMock.mockReset();
    repo = new PgLeaveTypeRepository();
  });

  describe('mapRow code fallback', () => {
    it('preserves a recognized LeaveTypeCode', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ code: 'sick' })] });

      const result = await repo.findById('lt-1');

      expect(result?.code).toBe(LeaveTypeCode.SICK);
    });

    it('falls back to UNPAID for an unknown code', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ code: 'sabbatical' })] });

      const result = await repo.findById('lt-1');

      expect(result?.code).toBe(LeaveTypeCode.UNPAID);
    });
  });

  describe('create', () => {
    it('maps snake_case columns and preserves flags', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      const result = await repo.create(makeLeaveType());

      expect(result).toEqual({
        id: 'lt-1',
        code: LeaveTypeCode.ANNUAL,
        name: 'Annual Leave',
        isPaid: true,
        requiresManagerApproval: true,
        isActive: true
      });
    });

    it('uses the provided client when given', async () => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [makeRow()] }) };
      queryMock.mockResolvedValue({ rows: [makeRow()] });

      await repo.create(makeLeaveType(), client as never);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  describe('findByCode', () => {
    it('passes the code and maps the result', async () => {
      queryMock.mockResolvedValue({ rows: [makeRow({ code: 'emergency' })] });

      const result = await repo.findByCode(LeaveTypeCode.EMERGENCY);

      expect(queryMock.mock.calls[0][1]).toEqual(['emergency']);
      expect(result?.code).toBe(LeaveTypeCode.EMERGENCY);
    });

    it('returns null when no row matches', async () => {
      queryMock.mockResolvedValue({ rows: [] });

      await expect(repo.findByCode(LeaveTypeCode.ANNUAL)).resolves.toBeNull();
    });
  });

  describe('findActive', () => {
    it('returns the mapped active list', async () => {
      queryMock.mockResolvedValue({
        rows: [
          makeRow({ id: 'lt-1' }),
          makeRow({ id: 'lt-2', code: 'sick', name: 'Sick Leave' })
        ]
      });

      const results = await repo.findActive();

      expect(results).toHaveLength(2);
      expect(results.map((t) => t.code)).toEqual([
        LeaveTypeCode.ANNUAL,
        LeaveTypeCode.SICK
      ]);
    });
  });
});
