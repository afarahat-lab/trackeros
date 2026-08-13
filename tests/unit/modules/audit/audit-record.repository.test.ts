import { AuditRepository } from '../../../../src/modules/audit/audit-record.repository';
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
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  changes: Record<string, unknown>;
  created_at: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'audit-1',
    entity_type: overrides.entity_type ?? 'leave_request',
    entity_id: overrides.entity_id ?? 'lr-1',
    action: overrides.action ?? 'APPROVED',
    performed_by: overrides.performed_by ?? 'user-1',
    changes: overrides.changes ?? { status: 'APPROVED' },
    created_at: overrides.created_at ?? new Date('2026-06-01T12:00:00Z'),
  };
}

const COLUMNS = [
  'id',
  'entity_type',
  'entity_id',
  'action',
  'performed_by',
  'changes',
  'created_at',
].join(', ');

describe('AuditRepository', () => {
  let repo: AuditRepository;

  beforeEach(() => {
    mockQuery.mockReset();
    repo = new AuditRepository();
  });

  describe('create', () => {
    it('should insert an audit record and return it', async () => {
      const row = makeRow({
        id: 'audit-new',
        entity_type: 'leave_request',
        entity_id: 'lr-1',
        action: 'SUBMITTED',
        performed_by: 'emp-1',
        changes: { status: 'SUBMITTED' },
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await repo.create({
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: 'SUBMITTED',
        performedBy: 'emp-1',
        changes: { status: 'SUBMITTED' },
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        [
          'leave_request',
          'lr-1',
          'SUBMITTED',
          'emp-1',
          JSON.stringify({ status: 'SUBMITTED' }),
        ],
      );
      expect(result.id).toBe('audit-new');
      expect(result.entityType).toBe('leave_request');
      expect(result.entityId).toBe('lr-1');
      expect(result.action).toBe('SUBMITTED');
      expect(result.performedBy).toBe('emp-1');
      expect(result.changes).toEqual({ status: 'SUBMITTED' });
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should store changes as JSON string', async () => {
      const changes = { status: 'APPROVED', approvedBy: 'mgr-1' };
      const row = makeRow({ id: 'audit-1', changes });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      await repo.create({
        entityType: 'leave_request',
        entityId: 'lr-1',
        action: 'APPROVED',
        performedBy: 'mgr-1',
        changes,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        [
          'leave_request',
          'lr-1',
          'APPROVED',
          'mgr-1',
          JSON.stringify(changes),
        ],
      );
    });
  });

  describe('findByEntity', () => {
    it('should return audit records for a given entity ordered by created_at DESC', async () => {
      const rows = [
        makeRow({ id: 'audit-2', created_at: new Date('2026-06-02T00:00:00Z') }),
        makeRow({ id: 'audit-1', created_at: new Date('2026-06-01T00:00:00Z') }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByEntity('leave_request', 'lr-1');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
        ['leave_request', 'lr-1'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-2');
      expect(result[1].id).toBe('audit-1');
    });

    it('should return empty array when no records found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByEntity('leave_request', 'nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findByPerformer', () => {
    it('should return audit records for a given performer ordered by created_at DESC', async () => {
      const rows = [
        makeRow({ id: 'audit-2', performed_by: 'user-1', created_at: new Date('2026-06-02T00:00:00Z') }),
        makeRow({ id: 'audit-1', performed_by: 'user-1', created_at: new Date('2026-06-01T00:00:00Z') }),
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByPerformer('user-1');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM audit_logs WHERE performed_by = $1 ORDER BY created_at DESC`,
        ['user-1'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-2');
      expect(result[1].id).toBe('audit-1');
    });

    it('should apply limit when provided', async () => {
      const rows = [makeRow({ id: 'audit-1' })];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await repo.findByPerformer('user-1', 5);

      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT ${COLUMNS} FROM audit_logs WHERE performed_by = $1 ORDER BY created_at DESC LIMIT $2`,
        ['user-1', 5],
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no records found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByPerformer('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('constructor with custom client', () => {
    it('should use the provided client instead of the default pool', async () => {
      const mockClient = { query: jest.fn() } as unknown as Pool;
      const customRepo = new AuditRepository(mockClient);
      mockClient.query = jest.fn().mockResolvedValueOnce({ rows: [] });

      await customRepo.findByEntity('leave_request', 'lr-1');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
