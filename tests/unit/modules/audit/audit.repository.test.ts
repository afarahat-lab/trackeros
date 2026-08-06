import { PgAuditLogRepository } from '../../../../src/modules/audit/audit.repository';
import { AuditLog } from '../../../../src/modules/audit/audit.model';

jest.mock('../../../../src/shared/db/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../../../../src/shared/db/connection';

function makeAuditLogRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const now = new Date();
  return {
    id: 'audit-001',
    entity_type: 'LeaveRequest',
    entity_id: 'lr-001',
    action: 'CREATE',
    old_values: null,
    new_values: { status: 'DRAFT' },
    performed_by: 'emp-001',
    performed_at: new Date('2025-01-15T10:00:00Z'),
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0',
    created_at: now,
    ...overrides,
  };
}

function makeAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  const now = new Date();
  return {
    id: 'audit-001',
    entityType: 'LeaveRequest',
    entityId: 'lr-001',
    action: 'CREATE',
    oldValues: null,
    newValues: { status: 'DRAFT' },
    performedBy: 'emp-001',
    performedAt: new Date('2025-01-15T10:00:00Z'),
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: now,
    ...overrides,
  };
}

describe('PgAuditLogRepository', () => {
  let repo: PgAuditLogRepository;
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    repo = new PgAuditLogRepository();
    mockQuery.mockReset();
  });

  describe('findById', () => {
    it('should return an audit log when found', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findById('audit-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE id = $1',
        ['audit-001']
      );
      expect(result).not.toBeNull();
      expect(result!.id).toBe('audit-001');
      expect(result!.entityType).toBe('LeaveRequest');
      expect(result!.entityId).toBe('lr-001');
      expect(result!.action).toBe('CREATE');
      expect(result!.oldValues).toBeNull();
      expect(result!.newValues).toEqual({ status: 'DRAFT' });
      expect(result!.performedBy).toBe('emp-001');
      expect(result!.ipAddress).toBe('127.0.0.1');
      expect(result!.userAgent).toBe('Mozilla/5.0');
    });

    it('should return null when audit log is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when row fails type guard', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123, entity_type: 'LeaveRequest' }], rowCount: 1 });

      const result = await repo.findById('audit-001');

      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(repo.findById('audit-001')).rejects.toThrow('connection refused');
    });
  });

  describe('findByEntity', () => {
    it('should return audit logs for a given entity', async () => {
      const row1 = makeAuditLogRow({ id: 'audit-001' });
      const row2 = makeAuditLogRow({ id: 'audit-002', action: 'UPDATE', old_values: { status: 'DRAFT' }, new_values: { status: 'SUBMITTED' } });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findByEntity('LeaveRequest', 'lr-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2',
        ['LeaveRequest', 'lr-001']
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-001');
      expect(result[1].id).toBe('audit-002');
    });

    it('should return an empty array when no audit logs found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByEntity('LeaveRequest', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeAuditLogRow({ id: 'audit-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findByEntity('LeaveRequest', 'lr-001');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('audit-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findByEntity('LeaveRequest', 'lr-001')).rejects.toThrow('query failed');
    });
  });

  describe('findByPerformedBy', () => {
    it('should return audit logs for a given performer', async () => {
      const row1 = makeAuditLogRow({ id: 'audit-001' });
      const row2 = makeAuditLogRow({ id: 'audit-002', entity_id: 'lr-002' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findByPerformedBy('emp-001');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE performed_by = $1',
        ['emp-001']
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('audit-001');
      expect(result[1].id).toBe('audit-002');
    });

    it('should apply LIMIT when provided', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findByPerformedBy('emp-001', 5);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE performed_by = $1 LIMIT $2',
        ['emp-001', 5]
      );
      expect(result).toHaveLength(1);
    });

    it('should return an empty array when no audit logs found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findByPerformedBy('unknown');

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeAuditLogRow({ id: 'audit-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findByPerformedBy('emp-001');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('audit-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findByPerformedBy('emp-001')).rejects.toThrow('query failed');
    });
  });

  describe('create', () => {
    it('should create an audit log entry and return it', async () => {
      const input = {
        entityType: 'LeaveRequest',
        entityId: 'lr-001',
        action: 'CREATE',
        oldValues: null,
        newValues: { status: 'DRAFT' },
        performedBy: 'emp-001',
        performedAt: new Date('2025-01-15T10:00:00Z'),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [makeAuditLogRow()],
        rowCount: 1,
      });

      const result = await repo.create(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryText = mockQuery.mock.calls[0][0];
      expect(queryText).toContain('INSERT INTO audit_logs');
      expect(queryText).toContain('RETURNING *');
      expect(result.entityType).toBe('LeaveRequest');
      expect(result.entityId).toBe('lr-001');
      expect(result.action).toBe('CREATE');
      expect(result.oldValues).toBeNull();
      expect(result.newValues).toEqual({ status: 'DRAFT' });
      expect(result.performedBy).toBe('emp-001');
      expect(result.ipAddress).toBe('127.0.0.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    it('should throw when insert returns no row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        repo.create({
          entityType: 'LeaveRequest',
          entityId: 'lr-001',
          action: 'CREATE',
          oldValues: null,
          newValues: null,
          performedBy: null,
          performedAt: new Date(),
          ipAddress: null,
          userAgent: null,
        })
      ).rejects.toThrow('Failed to create audit log entry');
    });

    it('should throw when insert returns invalid row', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 123 }], rowCount: 1 });

      await expect(
        repo.create({
          entityType: 'LeaveRequest',
          entityId: 'lr-001',
          action: 'CREATE',
          oldValues: null,
          newValues: null,
          performedBy: null,
          performedAt: new Date(),
          ipAddress: null,
          userAgent: null,
        })
      ).rejects.toThrow('Failed to create audit log entry');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('insert failed'));

      await expect(
        repo.create({
          entityType: 'LeaveRequest',
          entityId: 'lr-001',
          action: 'CREATE',
          oldValues: null,
          newValues: null,
          performedBy: null,
          performedAt: new Date(),
          ipAddress: null,
          userAgent: null,
        })
      ).rejects.toThrow('insert failed');
    });
  });

  describe('findAll', () => {
    it('should return all audit logs when no filters provided', async () => {
      const row1 = makeAuditLogRow({ id: 'audit-001' });
      const row2 = makeAuditLogRow({ id: 'audit-002', action: 'UPDATE' });
      mockQuery.mockResolvedValueOnce({ rows: [row1, row2], rowCount: 2 });

      const result = await repo.findAll({});

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs',
        undefined
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by entityType', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findAll({ entityType: 'LeaveRequest' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE entity_type = $1',
        ['LeaveRequest']
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by multiple fields', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findAll({ entityType: 'LeaveRequest', action: 'CREATE' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE entity_type = $1 AND action = $2',
        ['LeaveRequest', 'CREATE']
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by all supported fields', async () => {
      const row = makeAuditLogRow();
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

      const result = await repo.findAll({
        entityType: 'LeaveRequest',
        entityId: 'lr-001',
        action: 'CREATE',
        performedBy: 'emp-001',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 AND action = $3 AND performed_by = $4',
        ['LeaveRequest', 'lr-001', 'CREATE', 'emp-001']
      );
      expect(result).toHaveLength(1);
    });

    it('should return an empty array when no matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.findAll({ entityType: 'Nonexistent' });

      expect(result).toEqual([]);
    });

    it('should filter out rows that fail the type guard', async () => {
      const validRow = makeAuditLogRow({ id: 'audit-001' });
      const invalidRow = { id: 123 };
      mockQuery.mockResolvedValueOnce({ rows: [validRow, invalidRow], rowCount: 2 });

      const result = await repo.findAll({});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('audit-001');
    });

    it('should propagate database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query failed'));

      await expect(repo.findAll({})).rejects.toThrow('query failed');
    });
  });
});
