import { LeaveRequestRepository } from '../../../../src/modules/leave-request/leave-request.repository';
import { LeaveStatus } from '../../../../src/shared/types';
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
  employee_id: string;
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: Date | null;
  rejected_by: string | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'lr-1',
    employee_id: overrides.employee_id ?? 'emp-1',
    leave_type_id: overrides.leave_type_id ?? 'lt-1',
    start_date: overrides.start_date ?? new Date('2026-06-01T00:00:00Z'),
    end_date: overrides.end_date ?? new Date('2026-06-05T00:00:00Z'),
    reason: overrides.reason !== undefined ? overrides.reason : 'Vacation',
    status: overrides.status ?? LeaveStatus.SUBMITTED,
    approved_by: overrides.approved_by ?? null,
    approved_at: overrides.approved_at ?? null,
    rejected_by: overrides.rejected_by ?? null,
    rejected_at: overrides.rejected_at ?? null,
    rejection_reason: overrides.rejection_reason ?? null,
    created_at: overrides.created_at ?? new Date('2026-05-20T00:00:00Z'),
    updated_at: overrides.updated_at ?? new Date('2026-05-20T00:00:00Z'),
  };
}

const COLUMNS = [
  'id',
  'employee_id',
  'leave_type_id',
  'start_date',
  'end_date',
  'reason',
  'status',
  'approved_by',
  'approved_at',
  'rejected_by',
  'rejected_at',
  'rejection_reason',
  'created_at',
  'updated_at',
].join(', ');

describe('LeaveRequestRepository', () => {
  let repo: LeaveRequestRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    repo = new LeaveRequestRepository();
  });

  describe('findById', () => {
    it('should return the LeaveRequest when a row matches', async () => {
      const row = makeRow({ id: 'lr-1' });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-1');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_requests WHERE id = $1`,
        ['lr-1'],
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('lr-1');
      expect(result!.employeeId).toBe('emp-1');
      expect(result!.leaveTypeId).toBe('lt-1');
      expect(result!.startDate).toBeInstanceOf(Date);
      expect(result!.endDate).toBeInstanceOf(Date);
      expect(result!.reason).toBe('Vacation');
      expect(result!.status).toBe(LeaveStatus.SUBMITTED);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.rejectedBy).toBeNull();
      expect(result!.rejectedAt).toBeNull();
      expect(result!.rejectionReason).toBeUndefined();
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null when no row matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should map reason null to undefined', async () => {
      const row = makeRow({ id: 'lr-1', reason: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-1');

      expect(result!.reason).toBeUndefined();
    });

    it('should map rejection_reason null to undefined', async () => {
      const row = makeRow({ id: 'lr-1', rejection_reason: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-1');

      expect(result!.rejectionReason).toBeUndefined();
    });

    it('should preserve approvedBy and rejectedBy as null (not undefined)', async () => {
      const row = makeRow({
        id: 'lr-1',
        approved_by: null,
        rejected_by: null,
        approved_at: null,
        rejected_at: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findById('lr-1');

      expect(result!.approvedBy).toBeNull();
      expect(result!.rejectedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.rejectedAt).toBeNull();
    });
  });

  describe('findByEmployeeId', () => {
    it('should return all requests for an employee ordered by start_date DESC', async () => {
      const rows = [
        makeRow({ id: 'lr-1', start_date: new Date('2026-07-01') }),
        makeRow({ id: 'lr-2', start_date: new Date('2026-06-01') }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByEmployeeId('emp-1');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_requests WHERE employee_id = $1 ORDER BY start_date DESC`,
        ['emp-1'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-1');
      expect(result[1].id).toBe('lr-2');
    });

    it('should return empty array when employee has no requests', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEmployeeId('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findOverlapping', () => {
    it('should find overlapping requests excluding given statuses', async () => {
      const row = makeRow({
        id: 'lr-1',
        start_date: new Date('2026-06-01'),
        end_date: new Date('2026-06-10'),
        status: LeaveStatus.SUBMITTED,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.findOverlapping(
        'emp-1',
        new Date('2026-06-05'),
        new Date('2026-06-15'),
        [LeaveStatus.CANCELLED, LeaveStatus.REJECTED],
      );

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['emp-1', expect.any(Date), expect.any(Date), LeaveStatus.CANCELLED, LeaveStatus.REJECTED],
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lr-1');
    });

    it('should return empty array when no overlapping requests exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findOverlapping(
        'emp-1',
        new Date('2026-06-01'),
        new Date('2026-06-05'),
        [LeaveStatus.CANCELLED, LeaveStatus.REJECTED],
      );

      expect(result).toEqual([]);
    });

    it('should handle empty excludeStatuses array', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findOverlapping(
        'emp-1',
        new Date('2026-06-01'),
        new Date('2026-06-05'),
        [],
      );

      const callSql = mockQuery.mock.calls[0][0] as string;
      expect(callSql).not.toContain('NOT IN');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['emp-1', expect.any(Date), expect.any(Date)],
      );
    });

    it('should use correct overlap logic: start_date <= $3 AND end_date >= $2', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repo.findOverlapping(
        'emp-1',
        new Date('2026-06-01'),
        new Date('2026-06-10'),
        [LeaveStatus.CANCELLED],
      );

      const callSql = mockQuery.mock.calls[0][0] as string;
      expect(callSql).toContain('start_date <= $3');
      expect(callSql).toContain('end_date >= $2');
    });
  });

  describe('create', () => {
    it('should insert a new leave request and return it', async () => {
      const row = makeRow({
        id: 'lr-new',
        employee_id: 'emp-1',
        leave_type_id: 'lt-1',
        start_date: new Date('2026-07-01'),
        end_date: new Date('2026-07-05'),
        reason: 'Personal',
        status: LeaveStatus.DRAFT,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-05'),
        reason: 'Personal',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [
          'emp-1',
          'lt-1',
          expect.any(Date),
          expect.any(Date),
          'Personal',
          LeaveStatus.DRAFT,
        ],
      );
      expect(result.id).toBe('lr-new');
      expect(result.employeeId).toBe('emp-1');
      expect(result.leaveTypeId).toBe('lt-1');
      expect(result.reason).toBe('Personal');
      expect(result.status).toBe(LeaveStatus.DRAFT);
      expect(result.approvedBy).toBeNull();
      expect(result.rejectedBy).toBeNull();
    });

    it('should default status to DRAFT when not provided', async () => {
      const row = makeRow({ id: 'lr-1', status: LeaveStatus.DRAFT });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      await repo.create({
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-05'),
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [
          'emp-1',
          'lt-1',
          expect.any(Date),
          expect.any(Date),
          null,
          LeaveStatus.DRAFT,
        ],
      );
    });

    it('should accept an explicit status', async () => {
      const row = makeRow({ id: 'lr-1', status: LeaveStatus.SUBMITTED });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-05'),
        status: LeaveStatus.SUBMITTED,
      });

      expect(result.status).toBe(LeaveStatus.SUBMITTED);
    });

    it('should convert undefined reason to null for the DB', async () => {
      const row = makeRow({ id: 'lr-1', reason: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      await repo.create({
        employeeId: 'emp-1',
        leaveTypeId: 'lt-1',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-05'),
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        [
          'emp-1',
          'lt-1',
          expect.any(Date),
          expect.any(Date),
          null,
          LeaveStatus.DRAFT,
        ],
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status to APPROVED and set approval metadata while clearing rejection fields', async () => {
      const approvedAt = new Date('2026-06-01T12:00:00Z');
      const row = makeRow({
        id: 'lr-1',
        status: LeaveStatus.APPROVED,
        approved_by: 'mgr-1',
        approved_at: approvedAt,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.APPROVED, {
        approvedBy: 'mgr-1',
        approvedAt,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const callSql: string = mockQuery.mock.calls[0][0];
      expect(callSql).toContain('UPDATE leave_requests SET');
      expect(callSql).toContain('status = $1');
      expect(callSql).toContain('approved_by = $2');
      expect(callSql).toContain('approved_at = $3');
      expect(callSql).toContain('rejected_by = NULL');
      expect(callSql).toContain('rejected_at = NULL');
      expect(callSql).toContain('rejection_reason = NULL');
      expect(callSql).toContain('updated_at = NOW()');

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveStatus.APPROVED);
      expect(result!.approvedBy).toBe('mgr-1');
      expect(result!.approvedAt).toEqual(approvedAt);
      expect(result!.rejectedBy).toBeNull();
      expect(result!.rejectedAt).toBeNull();
      expect(result!.rejectionReason).toBeUndefined();
    });

    it('should update status to REJECTED and set rejection metadata while clearing approval fields', async () => {
      const rejectedAt = new Date('2026-06-01T12:00:00Z');
      const row = makeRow({
        id: 'lr-1',
        status: LeaveStatus.REJECTED,
        approved_by: null,
        approved_at: null,
        rejected_by: 'mgr-1',
        rejected_at: rejectedAt,
        rejection_reason: 'Insufficient staffing',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.REJECTED, {
        rejectedBy: 'mgr-1',
        rejectedAt,
        rejectionReason: 'Insufficient staffing',
      });

      const callSql: string = mockQuery.mock.calls[0][0];
      expect(callSql).toContain('rejected_by = $2');
      expect(callSql).toContain('rejected_at = $3');
      expect(callSql).toContain('rejection_reason = $4');
      expect(callSql).toContain('approved_by = NULL');
      expect(callSql).toContain('approved_at = NULL');

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveStatus.REJECTED);
      expect(result!.approvedBy).toBeNull();
      expect(result!.approvedAt).toBeNull();
      expect(result!.rejectedBy).toBe('mgr-1');
      expect(result!.rejectedAt).toEqual(rejectedAt);
      expect(result!.rejectionReason).toBe('Insufficient staffing');
    });

    it('should update status to CANCELLED and clear both approval and rejection metadata', async () => {
      const row = makeRow({
        id: 'lr-1',
        status: LeaveStatus.CANCELLED,
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.CANCELLED, {});

      const callSql: string = mockQuery.mock.calls[0][0];
      expect(callSql).toContain('approved_by = NULL');
      expect(callSql).toContain('approved_at = NULL');
      expect(callSql).toContain('rejected_by = NULL');
      expect(callSql).toContain('rejected_at = NULL');
      expect(callSql).toContain('rejection_reason = NULL');

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveStatus.CANCELLED);
      expect(result!.approvedBy).toBeNull();
      expect(result!.rejectedBy).toBeNull();
    });

    it('should update status to SUBMITTED and clear both approval and rejection metadata', async () => {
      const row = makeRow({
        id: 'lr-1',
        status: LeaveStatus.SUBMITTED,
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.SUBMITTED, {});

      const callSql: string = mockQuery.mock.calls[0][0];
      expect(callSql).toContain('approved_by = NULL');
      expect(callSql).toContain('rejected_by = NULL');

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveStatus.SUBMITTED);
    });

    it('should return null when no row matches the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.updateStatus('nonexistent', LeaveStatus.APPROVED, {
        approvedBy: 'mgr-1',
        approvedAt: new Date(),
      });

      expect(result).toBeNull();
    });

    it('should handle metadata with null values for clearing fields', async () => {
      const row = makeRow({
        id: 'lr-1',
        status: LeaveStatus.DRAFT,
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.updateStatus('lr-1', LeaveStatus.DRAFT, {
        approvedBy: null,
        rejectedBy: null,
        rejectionReason: null,
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe(LeaveStatus.DRAFT);
    });
  });

  describe('findByStatus', () => {
    it('should return all requests with the given status ordered by start_date ASC', async () => {
      const rows = [
        makeRow({ id: 'lr-1', status: LeaveStatus.SUBMITTED, start_date: new Date('2026-06-01') }),
        makeRow({ id: 'lr-2', status: LeaveStatus.SUBMITTED, start_date: new Date('2026-07-01') }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByStatus(LeaveStatus.SUBMITTED);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM leave_requests WHERE status = $1 ORDER BY start_date ASC`,
        [LeaveStatus.SUBMITTED],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lr-1');
      expect(result[1].id).toBe('lr-2');
      expect(result[0].status).toBe(LeaveStatus.SUBMITTED);
      expect(result[1].status).toBe(LeaveStatus.SUBMITTED);
    });

    it('should return empty array when no requests match the status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByStatus(LeaveStatus.APPROVED);

      expect(result).toEqual([]);
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided client instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as Pool;
      const customRepo = new LeaveRequestRepository(mockClient);
      mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      await customRepo.findByEmployeeId('emp-1');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
