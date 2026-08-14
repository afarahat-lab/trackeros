import { PgLeaveRequestRepository } from '../../../../src/modules/leave-request/leave-request.repository';
import { LeaveRequest } from '../../../../src/modules/leave-request/leave-request.model';
import { LeaveType, LeaveRequestStatus } from '../../../../src/shared/types/leave.types';
import { UniqueConstraintViolationError } from '../../../../src/modules/employee/employee.repository';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

const mockQuery = pool.query as jest.Mock;

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'lr-001',
    employee_id: 'emp-001',
    leave_type: 'annual',
    start_date: '2026-07-01T00:00:00.000Z',
    end_date: '2026-07-05T00:00:00.000Z',
    reason: 'vacation',
    status: 'SUBMITTED',
    approved_by: null,
    approved_at: null,
    created_at: '2026-06-15T00:00:00.000Z',
    updated_at: '2026-06-15T00:00:00.000Z',
    ...overrides,
  };
}

function makeLeaveRequest(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 'lr-001',
    employeeId: 'emp-001',
    leaveType: LeaveType.ANNUAL,
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: new Date('2026-07-05T00:00:00.000Z'),
    reason: 'vacation',
    status: LeaveRequestStatus.SUBMITTED,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2026-06-15T00:00:00.000Z'),
    updatedAt: new Date('2026-06-15T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PgLeaveRequestRepository', () => {
  let repo: PgLeaveRequestRepository;

  beforeEach(() => {
    repo = new PgLeaveRequestRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('returns the leave request when found', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE id = $1',
        ['lr-001'],
      );
      expect(result).toEqual(makeLeaveRequest());
    });

    it('returns null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('lr-999');

      expect(result).toBeNull();
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findById('lr-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findByEmployeeId', () => {
    it('returns all leave requests for the employee ordered by created_at DESC', async () => {
      const rows = [
        makeRow(),
        makeRow({ id: 'lr-002', leave_type: 'sick', reason: 'illness' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByEmployeeId('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC',
        ['emp-001'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-001');
      expect(result[1].id).toBe('lr-002');
    });

    it('returns an empty array when no requests exist for the employee', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId('emp-001');

      expect(result).toEqual([]);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findByEmployeeId('emp-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findOverlapping', () => {
    it('returns SUBMITTED/APPROVED requests whose date range overlaps the supplied range', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findOverlapping(
        'emp-001',
        new Date('2026-07-03T00:00:00.000Z'),
        new Date('2026-07-10T00:00:00.000Z'),
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1'),
        [
          'emp-001',
          new Date('2026-07-03T00:00:00.000Z'),
          new Date('2026-07-10T00:00:00.000Z'),
          LeaveRequestStatus.SUBMITTED,
          LeaveRequestStatus.APPROVED,
        ],
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-001');
    });

    it('returns an empty array when no overlapping requests exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findOverlapping(
        'emp-001',
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-08-10T00:00:00.000Z'),
      );

      expect(result).toEqual([]);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findOverlapping(
        'emp-001',
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-05T00:00:00.000Z'),
        client as unknown as import('pg').PoolClient,
      );

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const input = {
      employeeId: 'emp-001',
      leaveType: LeaveType.ANNUAL,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-05T00:00:00.000Z'),
      reason: 'vacation',
      status: LeaveRequestStatus.SUBMITTED,
      approvedBy: null,
      approvedAt: null,
    };

    it('persists a new leave request and returns the entity with server-generated fields', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [
          'emp-001',
          'annual',
          new Date('2026-07-01T00:00:00.000Z'),
          new Date('2026-07-05T00:00:00.000Z'),
          'vacation',
          'SUBMITTED',
          null,
          null,
        ],
      );
      expect(result).toEqual(makeLeaveRequest());
    });

    it('persists a leave request with undefined reason as null', async () => {
      const row = makeRow({ reason: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        ...input,
        reason: undefined,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [
          'emp-001',
          'annual',
          new Date('2026-07-01T00:00:00.000Z'),
          new Date('2026-07-05T00:00:00.000Z'),
          null,
          'SUBMITTED',
          null,
          null,
        ],
      );
      expect(result.reason).toBeUndefined();
    });

    it('throws UniqueConstraintViolationError on unique violation (code 23505)', async () => {
      const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(repo.create(input)).rejects.toThrow(UniqueConstraintViolationError);
    });

    it('re-throws non-unique-constraint errors', async () => {
      const pgError = new Error('connection refused');
      mockQuery.mockRejectedValueOnce(pgError);

      await expect(repo.create(input)).rejects.toThrow('connection refused');
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.create(input, client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('updates the status and returns the refreshed entity', async () => {
      const updatedRow = makeRow({
        status: 'APPROVED',
        approved_by: 'mgr-001',
        approved_at: '2026-06-20T00:00:00.000Z',
        updated_at: '2026-06-20T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.updateStatus('lr-001', LeaveRequestStatus.APPROVED);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests'),
        ['APPROVED', 'lr-001'],
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveRequestStatus.APPROVED);
      expect(result!.updatedAt).toEqual(new Date('2026-06-20T00:00:00.000Z'));
    });

    it('returns null when the leave request does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus('lr-999', LeaveRequestStatus.APPROVED);

      expect(result).toBeNull();
    });

    it('persists the exact status supplied by the caller without coercion', async () => {
      const updatedRow = makeRow({
        status: 'CANCELLED',
        updated_at: '2026-06-20T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await repo.updateStatus('lr-001', LeaveRequestStatus.CANCELLED);

      expect(result!.status).toBe(LeaveRequestStatus.CANCELLED);
    });

    it('uses the provided PoolClient when given (transaction-joining)', async () => {
      const client = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [makeRow({ status: 'APPROVED', updated_at: '2026-06-20T00:00:00.000Z' })],
        }),
      };
      await repo.updateStatus('lr-001', LeaveRequestStatus.APPROVED, client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('findAllPendingByManagerId', () => {
    it('returns SUBMITTED leave requests for the manager\'s direct reports', async () => {
      const rows = [
        makeRow(),
        makeRow({ id: 'lr-002', employee_id: 'emp-002' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findAllPendingByManagerId('mgr-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN employees e ON lr.employee_id = e.id'),
        ['mgr-001', LeaveRequestStatus.SUBMITTED],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-001');
      expect(result[1].id).toBe('lr-002');
    });

    it('returns an empty array when no pending requests exist for the manager\'s reports', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findAllPendingByManagerId('mgr-001');

      expect(result).toEqual([]);
    });

    it('uses the provided PoolClient when given', async () => {
      const client = { query: jest.fn().mockResolvedValueOnce({ rows: [makeRow()] }) };
      await repo.findAllPendingByManagerId('mgr-001', client as unknown as import('pg').PoolClient);

      expect(client.query).toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('rowToLeaveRequest (via findById)', () => {
    it('converts date strings to Date objects', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-001');

      expect(result!.startDate).toBeInstanceOf(Date);
      expect(result!.endDate).toBeInstanceOf(Date);
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });

    it('preserves null for approvedBy and approvedAt when not approved', async () => {
      const row = makeRow();
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-001');

      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
    });

    it('maps approved_at to Date when present', async () => {
      const row = makeRow({
        status: 'APPROVED',
        approved_by: 'mgr-001',
        approved_at: '2026-06-20T00:00:00.000Z',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-001');

      expect(result!.approvedBy).toBe('mgr-001');
      expect(result!.approvedAt).toBeInstanceOf(Date);
      expect(result!.approvedAt).toEqual(new Date('2026-06-20T00:00:00.000Z'));
    });

    it('surfaces null reason as undefined', async () => {
      const row = makeRow({ reason: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-001');

      expect(result!.reason).toBeUndefined();
    });

    it('casts leaveType and status to their respective enums', async () => {
      const row = makeRow({ leave_type: 'sick', status: 'APPROVED' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-001');

      expect(result!.leaveType).toBe(LeaveType.SICK);
      expect(result!.status).toBe(LeaveRequestStatus.APPROVED);
    });
  });
});
